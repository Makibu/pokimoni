import {and, asc, count, desc, eq, inArray, or} from "drizzle-orm";
import {
    collectionPercent,
    DEFAULT_PROFILE_STATS,
    daysInGame,
    PROFILE_STAT_LABELS,
    type ProfileStat,
} from "@/domain/profile";
import {rarityRank} from "@/domain/rarity";
import {formatNumber} from "@/lib/format";
import type {UpdateProfileInput} from "@/lib/validation/social";
import {
    badges,
    cards,
    friendRequests,
    packOpenings,
    playerState,
    profileStats,
    sets,
    showcase,
    trades,
    userAchievements,
    userBadges,
    userCards,
    users,
} from "@/server/db/schema";
import type {Db} from "@/server/db/types";
import {AppError} from "@/server/http/errors";
import {areFriends, betweenPlayers} from "./friends";
import {publicPlayerFields, type PublicPlayer} from "./players";
import {incomePerHour} from "./progress";
import type {TradeCard} from "./trades";
import {lockPlayers} from "./wallet";

const NOTHING_YET = "Jeszcze brak";

async function countUniqueCards(db: Db, userId: string) {
    const [[{unique}], [{catalog}]] = await Promise.all([
        db.select({unique: count()}).from(userCards).where(eq(userCards.userId, userId)),
        db.select({catalog: count()}).from(cards),
    ]);
    return {unique, catalog};
}

/** Each statistic reads only what it needs, because a profile shows at most three of them. */
const STAT_READERS: Record<ProfileStat, (db: Db, userId: string, now: Date) => Promise<string>> = {
    unique_cards: async (db, userId) => {
        const {unique, catalog} = await countUniqueCards(db, userId);
        return `${formatNumber(unique)} z ${formatNumber(catalog)}`;
    },
    collection_percent: async (db, userId) => {
        const {unique, catalog} = await countUniqueCards(db, userId);
        return `${formatNumber(collectionPercent(unique, catalog))}%`;
    },
    packs_opened: async (db, userId) => {
        const [{n}] = await db.select({n: count()}).from(packOpenings).where(eq(packOpenings.userId, userId));
        return formatNumber(n);
    },
    achievements: async (db, userId) => {
        const [{n}] = await db.select({n: count()}).from(userAchievements).where(eq(userAchievements.userId, userId));
        return formatNumber(n);
    },
    badges: async (db, userId) => {
        const [{n}] = await db.select({n: count()}).from(userBadges).where(eq(userBadges.userId, userId));
        return formatNumber(n);
    },
    completed_sets: async (db, userId) => {
        const [catalog, owned] = await Promise.all([
            db.select({setId: cards.setId, n: count()}).from(cards).groupBy(cards.setId),
            db
                .select({setId: cards.setId, n: count()})
                .from(userCards)
                .innerJoin(cards, eq(cards.id, userCards.cardId))
                .where(eq(userCards.userId, userId))
                .groupBy(cards.setId),
        ]);
        const sizeOfSet = new Map(catalog.map((row) => [row.setId, row.n]));
        return formatNumber(owned.filter((row) => row.n === sizeOfSet.get(row.setId)).length);
    },
    rarest_card: async (db, userId) => {
        const owned = await db
            .select({name: cards.name, rarity: cards.rarity, income: cards.income})
            .from(userCards)
            .innerJoin(cards, eq(cards.id, userCards.cardId))
            .where(eq(userCards.userId, userId));
        const [rarest] = owned.sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || b.income - a.income);
        return rarest?.name ?? NOTHING_YET;
    },
    favorite_set: async (db, userId) => {
        const [favorite] = await db
            .select({name: sets.name})
            .from(packOpenings)
            .innerJoin(sets, eq(sets.id, packOpenings.setId))
            .where(eq(packOpenings.userId, userId))
            .groupBy(sets.id)
            .orderBy(desc(count()), asc(sets.name))
            .limit(1);
        return favorite?.name ?? NOTHING_YET;
    },
    trades: async (db, userId) => {
        const [{n}] = await db
            .select({n: count()})
            .from(trades)
            .where(and(eq(trades.status, "accepted"), or(eq(trades.fromUserId, userId), eq(trades.toUserId, userId))));
        return formatNumber(n);
    },
    income_per_hour: async (db, userId) => {
        const [state] = await db.select().from(playerState).where(eq(playerState.userId, userId));
        return `${formatNumber(await incomePerHour(db, state.slot1CardId, state.slot2CardId))}/h`;
    },
    days_in_game: async (db, userId, now) => {
        const [user] = await db.select({createdAt: users.createdAt}).from(users).where(eq(users.id, userId));
        return formatNumber(daysInGame(user.createdAt, now));
    },
};

export type ProfileRelation = "self" | "friend" | "invited" | "invited_you" | "none";

export type ProfileView = {
    player: PublicPlayer;
    relation: ProfileRelation;
    /** The open invitation between the viewer and this player, if there is one. */
    requestId: number | null;
    hasOpenOffer: boolean;
    badges: {id: number; name: string; description: string; icon: string}[];
    stats: {stat: ProfileStat; label: string; value: string}[];
    showcase: TradeCard[];
};

async function loadRelation(db: Db, viewerId: string, userId: string) {
    if (viewerId === userId) return {relation: "self" as const, requestId: null, hasOpenOffer: false};
    const [friends, [request], [offer]] = await Promise.all([
        areFriends(db, viewerId, userId),
        db
            .select({id: friendRequests.id, fromUserId: friendRequests.fromUserId})
            .from(friendRequests)
            .where(
                and(
                    eq(friendRequests.status, "pending"),
                    betweenPlayers(friendRequests.fromUserId, friendRequests.toUserId, viewerId, userId),
                ),
            ),
        db
            .select({id: trades.id})
            .from(trades)
            .where(and(eq(trades.fromUserId, viewerId), eq(trades.toUserId, userId), eq(trades.status, "pending"))),
    ]);
    if (friends) return {relation: "friend" as const, requestId: null, hasOpenOffer: offer !== undefined};
    if (!request) return {relation: "none" as const, requestId: null, hasOpenOffer: false};
    return {
        relation: request.fromUserId === viewerId ? ("invited" as const) : ("invited_you" as const),
        requestId: request.id,
        hasOpenOffer: false,
    };
}

/** A profile as another logged-in player sees it. Contains only public data, never the email. */
export async function getProfile(db: Db, viewerId: string, userId: string, now = new Date()): Promise<ProfileView> {
    const [player] = await db.select(publicPlayerFields).from(users).where(eq(users.id, userId));
    if (!player) throw new AppError(404, "player_not_found", "Nie znaleziono gracza");

    const [relation, earnedBadges, chosenStats, showcaseRows] = await Promise.all([
        loadRelation(db, viewerId, userId),
        db
            .select({id: badges.id, name: badges.name, description: badges.description, icon: badges.icon})
            .from(userBadges)
            .innerJoin(badges, eq(badges.id, userBadges.badgeId))
            .where(eq(userBadges.userId, userId))
            .orderBy(asc(badges.id)),
        db
            .select({stat: profileStats.stat})
            .from(profileStats)
            .where(eq(profileStats.userId, userId))
            .orderBy(asc(profileStats.position)),
        db
            .select({
                id: cards.id,
                name: cards.name,
                rarity: cards.rarity,
                income: cards.income,
                images: cards.images,
            })
            .from(showcase)
            .innerJoin(cards, eq(cards.id, showcase.cardId))
            .where(eq(showcase.userId, userId))
            .orderBy(asc(showcase.position)),
    ]);

    const shownStats = chosenStats.length > 0 ? chosenStats.map((row) => row.stat) : DEFAULT_PROFILE_STATS;
    const stats = await Promise.all(
        shownStats.map(async (stat) => ({
            stat,
            label: PROFILE_STAT_LABELS[stat],
            value: await STAT_READERS[stat](db, userId, now),
        })),
    );

    return {
        player,
        ...relation,
        badges: earnedBadges,
        stats,
        showcase: showcaseRows.map((card) => ({
            id: card.id,
            name: card.name,
            rarity: card.rarity,
            income: card.income,
            imageSmall: card.images.small,
            imageLarge: card.images.large,
        })),
    };
}

/** Replaces the player's statistics and showcase. Being in the showcase does not lock a card. */
export async function updateProfile(db: Db, userId: string, input: UpdateProfileInput) {
    await db.transaction(async (tx) => {
        // Trades change the same showcase rows and take this lock too.
        await lockPlayers(tx, userId, userId);

        if (input.showcase.length > 0) {
            const owned = await tx
                .select({cardId: userCards.cardId})
                .from(userCards)
                .where(and(eq(userCards.userId, userId), inArray(userCards.cardId, input.showcase)));
            if (owned.length !== input.showcase.length) {
                throw new AppError(409, "card_not_owned", "W gablocie mogą być tylko karty z Twojej kolekcji");
            }
        }

        await tx.delete(showcase).where(eq(showcase.userId, userId));
        if (input.showcase.length > 0) {
            await tx
                .insert(showcase)
                .values(input.showcase.map((cardId, index) => ({userId, position: index + 1, cardId})));
        }

        await tx.delete(profileStats).where(eq(profileStats.userId, userId));
        await tx.insert(profileStats).values(input.stats.map((stat, index) => ({userId, position: index + 1, stat})));
    });
}

/** The player's choices as they can be edited, including statistics still on their default. */
export async function getProfileChoices(db: Db, userId: string) {
    const [stats, cardsInShowcase] = await Promise.all([
        db
            .select({stat: profileStats.stat})
            .from(profileStats)
            .where(eq(profileStats.userId, userId))
            .orderBy(asc(profileStats.position)),
        db
            .select({cardId: showcase.cardId})
            .from(showcase)
            .where(eq(showcase.userId, userId))
            .orderBy(asc(showcase.position)),
    ]);
    return {
        stats: stats.length > 0 ? stats.map((row) => row.stat) : DEFAULT_PROFILE_STATS,
        showcase: cardsInShowcase.map((row) => row.cardId),
    };
}
