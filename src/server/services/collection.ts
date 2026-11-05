import {and, asc, count, desc, eq, sql} from "drizzle-orm";
import {type Rarity, rarityRank} from "@/domain/rarity";
import {
    achievements,
    badges,
    cards,
    packOpenings,
    sets,
    userAchievements,
    userBadges,
    trades,
    userCards,
} from "@/server/db/schema";
import type {Db} from "@/server/db/types";
import {AppError} from "@/server/http/errors";
import {loadProgress} from "./progress";

export type CollectionSet = {
    id: string;
    name: string;
    series: string;
    logo: string;
    total: number;
    collected: number;
};

export async function listCollectionSets(db: Db, userId: string): Promise<CollectionSet[]> {
    const [allSets, collected] = await Promise.all([
        db.select().from(sets).orderBy(asc(sets.name)),
        db
            .select({setId: cards.setId, n: count()})
            .from(userCards)
            .innerJoin(cards, eq(cards.id, userCards.cardId))
            .where(eq(userCards.userId, userId))
            .groupBy(cards.setId),
    ]);
    const collectedBySet = new Map(collected.map((row) => [row.setId, row.n]));
    return allSets.map((set) => ({
        id: set.id,
        name: set.name,
        series: set.series,
        logo: set.images.logo,
        total: set.total,
        collected: collectedBySet.get(set.id) ?? 0,
    }));
}

export type CollectionCard = {
    id: string;
    name: string;
    rarity: Rarity;
    income: number;
    imageSmall: string;
    imageLarge: string;
    quantity: number;
    /** Copies held in the player's open trade offers. They still belong to the player but cannot be used. */
    escrowed: number;
    firstAcquiredAt: string | null;
};

const collectionCardFields = {
    id: cards.id,
    name: cards.name,
    rarity: cards.rarity,
    income: cards.income,
    images: cards.images,
    quantity: userCards.quantity,
    firstAcquiredAt: userCards.firstAcquiredAt,
};

async function loadEscrowedCopies(db: Db, userId: string): Promise<Map<string, number>> {
    const rows = await db
        .select({cardId: trades.offeredCardId, n: count()})
        .from(trades)
        .where(and(eq(trades.fromUserId, userId), eq(trades.status, "pending")))
        .groupBy(trades.offeredCardId);
    return new Map(rows.map((row) => [row.cardId, row.n]));
}

function toCollectionCard(
    row: {
        id: string;
        name: string;
        rarity: Rarity;
        income: number;
        images: {small: string; large: string};
        quantity: number | null;
        firstAcquiredAt: Date | null;
    },
    escrowed: Map<string, number>,
): CollectionCard {
    return {
        id: row.id,
        name: row.name,
        rarity: row.rarity,
        income: row.income,
        imageSmall: row.images.small,
        imageLarge: row.images.large,
        quantity: row.quantity ?? 0,
        escrowed: escrowed.get(row.id) ?? 0,
        firstAcquiredAt: row.firstAcquiredAt?.toISOString() ?? null,
    };
}

/** All cards of a set; cards the player does not own have quantity 0. */
export async function getSetCollection(db: Db, userId: string, setId: string) {
    const [set] = await db.select().from(sets).where(eq(sets.id, setId));
    if (!set) throw new AppError(404, "set_not_found", "Nie znaleziono zestawu");
    const [rows, escrowed] = await Promise.all([
        db
            .select(collectionCardFields)
            .from(cards)
            .leftJoin(userCards, and(eq(userCards.cardId, cards.id), eq(userCards.userId, userId)))
            .where(eq(cards.setId, setId)),
        loadEscrowedCopies(db, userId),
    ]);
    return {set: {id: set.id, name: set.name}, cards: rows.map((row) => toCollectionCard(row, escrowed))};
}

/** Every card the player owns, from the rarest. Used by the income slot picker. */
export async function listOwnedCards(db: Db, userId: string): Promise<CollectionCard[]> {
    const [rows, escrowed] = await Promise.all([
        db
            .select(collectionCardFields)
            .from(userCards)
            .innerJoin(cards, eq(cards.id, userCards.cardId))
            .where(eq(userCards.userId, userId)),
        loadEscrowedCopies(db, userId),
    ]);
    return rows
        .map((row) => toCollectionCard(row, escrowed))
        .sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity));
}

const MIN_ACTIVITY_RANK = rarityRank("special illustration rare");
const ACTIVITY_LIMIT = 5;

export type ActivityEntry = {kind: "card" | "achievement" | "badge"; item: string; time: string};

export async function getStatistics(db: Db, userId: string) {
    const progress = await loadProgress(db, userId);

    const [favorite, bestCardRow, recentCards, recentAchievements, badgeRows, [{totalAchievements}], [{unlocked}]] =
        await Promise.all([
            db
                .select({id: sets.id, name: sets.name, images: sets.images, opened: count()})
                .from(packOpenings)
                .innerJoin(sets, eq(sets.id, packOpenings.setId))
                .where(eq(packOpenings.userId, userId))
                .groupBy(sets.id)
                .orderBy(desc(count()))
                .limit(1),
            db
                .select({name: cards.name, rarity: cards.rarity, income: cards.income, images: cards.images})
                .from(userCards)
                .innerJoin(cards, eq(cards.id, userCards.cardId))
                .where(eq(userCards.userId, userId))
                .orderBy(desc(cards.income))
                .limit(1),
            db
                .select({name: cards.name, rarity: cards.rarity, time: userCards.firstAcquiredAt})
                .from(userCards)
                .innerJoin(cards, eq(cards.id, userCards.cardId))
                .where(
                    and(
                        eq(userCards.userId, userId),
                        sql`${cards.rarity} in ('special illustration rare', 'hyper rare', 'secret rare')`,
                    ),
                )
                .orderBy(desc(userCards.firstAcquiredAt))
                .limit(ACTIVITY_LIMIT),
            db
                .select({title: achievements.title, time: userAchievements.unlockedAt})
                .from(userAchievements)
                .innerJoin(achievements, eq(achievements.id, userAchievements.achievementId))
                .where(eq(userAchievements.userId, userId))
                .orderBy(desc(userAchievements.unlockedAt))
                .limit(ACTIVITY_LIMIT),
            db
                .select({
                    id: badges.id,
                    name: badges.name,
                    description: badges.description,
                    icon: badges.icon,
                    acquiredAt: userBadges.acquiredAt,
                })
                .from(badges)
                .leftJoin(userBadges, and(eq(userBadges.badgeId, badges.id), eq(userBadges.userId, userId)))
                .orderBy(asc(badges.id)),
            db.select({totalAchievements: count()}).from(achievements),
            db.select({unlocked: count()}).from(userAchievements).where(eq(userAchievements.userId, userId)),
        ]);

    const activity: ActivityEntry[] = [
        ...recentCards
            .filter((card) => rarityRank(card.rarity) >= MIN_ACTIVITY_RANK)
            .map((card) => ({
                kind: "card" as const,
                item: `${card.name} (${card.rarity})`,
                time: card.time.toISOString(),
            })),
        ...recentAchievements.map((entry) => ({
            kind: "achievement" as const,
            item: entry.title,
            time: entry.time.toISOString(),
        })),
        ...badgeRows.flatMap((badge) =>
            badge.acquiredAt ? [{kind: "badge" as const, item: badge.name, time: badge.acquiredAt.toISOString()}] : [],
        ),
    ]
        .sort((a, b) => b.time.localeCompare(a.time))
        .slice(0, ACTIVITY_LIMIT);

    return {
        uniqueCards: progress.uniqueCards,
        totalCards: progress.totalCards,
        catalogCards: progress.catalogCards,
        duplicates: progress.totalCards - progress.uniqueCards,
        packsOpened: progress.packsOpened,
        achievementsUnlocked: unlocked,
        achievementsTotal: totalAchievements,
        incomePerHour: progress.incomePerHour,
        copiesByRarity: progress.copiesByRarity,
        favoriteSet: favorite[0]
            ? {name: favorite[0].name, logo: favorite[0].images.logo, opened: favorite[0].opened}
            : null,
        bestCard: bestCardRow[0]
            ? {
                  name: bestCardRow[0].name,
                  rarity: bestCardRow[0].rarity,
                  income: bestCardRow[0].income,
                  imageSmall: bestCardRow[0].images.small,
              }
            : null,
        badges: badgeRows.map((badge) => ({
            id: badge.id,
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            earned: badge.acquiredAt !== null,
        })),
        recentActivity: activity,
    };
}

export type Statistics = Awaited<ReturnType<typeof getStatistics>>;
