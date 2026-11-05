import {and, count, eq, inArray, isNull, notInArray, sql, sum} from "drizzle-orm";
import type {PackTier} from "@/domain/economy";
import {isAchievementMet, isBadgeMet, type PlayerProgress} from "@/domain/progress";
import type {Rarity} from "@/domain/rarity";
import {
    achievements,
    badges,
    cards,
    packOpenings,
    packVouchers,
    playerState,
    userAchievements,
    userBadges,
    userCards,
} from "@/server/db/schema";
import type {Db, Tx} from "@/server/db/types";
import {AppError} from "@/server/http/errors";
import {changeCoins} from "./coins";

export async function incomePerHour(db: Db | Tx, slot1: string | null, slot2: string | null): Promise<number> {
    const slotted = [slot1, slot2].filter((id): id is string => id !== null);
    if (slotted.length === 0) return 0;
    const rows = await db.select({id: cards.id, income: cards.income}).from(cards).where(inArray(cards.id, slotted));
    const incomeById = new Map(rows.map((row) => [row.id, row.income]));
    return slotted.reduce((total, id) => total + (incomeById.get(id) ?? 0), 0);
}

export async function loadProgress(db: Db | Tx, userId: string): Promise<PlayerProgress> {
    const copies = await db
        .select({rarity: cards.rarity, unique: count(), total: sum(userCards.quantity).mapWith(Number)})
        .from(userCards)
        .innerJoin(cards, eq(cards.id, userCards.cardId))
        .where(eq(userCards.userId, userId))
        .groupBy(cards.rarity);
    const [{catalogCards}] = await db.select({catalogCards: count()}).from(cards);
    const [{packsOpened}] = await db
        .select({packsOpened: count()})
        .from(packOpenings)
        .where(eq(packOpenings.userId, userId));
    const [state] = await db.select().from(playerState).where(eq(playerState.userId, userId));

    const copiesByRarity: Partial<Record<Rarity, number>> = {};
    for (const row of copies) copiesByRarity[row.rarity] = row.total;

    return {
        uniqueCards: copies.reduce((total, row) => total + row.unique, 0),
        totalCards: copies.reduce((total, row) => total + row.total, 0),
        catalogCards,
        packsOpened,
        incomePerHour: state ? await incomePerHour(db, state.slot1CardId, state.slot2CardId) : 0,
        copiesByRarity,
    };
}

export type EarnedRewards = {
    achievements: {id: number; title: string}[];
    badges: {id: number; name: string}[];
};

/** Unlocks every achievement and badge the player now qualifies for. Unlocks are permanent. */
export async function evaluateProgress(tx: Tx, userId: string): Promise<EarnedRewards> {
    const progress = await loadProgress(tx, userId);

    const unlocked = tx
        .select({id: userAchievements.achievementId})
        .from(userAchievements)
        .where(eq(userAchievements.userId, userId));
    const lockedAchievements = await tx.select().from(achievements).where(notInArray(achievements.id, unlocked));
    const newAchievements = lockedAchievements.filter((achievement) => isAchievementMet(achievement, progress));
    if (newAchievements.length > 0) {
        await tx
            .insert(userAchievements)
            .values(newAchievements.map((achievement) => ({userId, achievementId: achievement.id})))
            .onConflictDoNothing();
    }

    const earned = tx.select({id: userBadges.badgeId}).from(userBadges).where(eq(userBadges.userId, userId));
    const missingBadges = await tx.select().from(badges).where(notInArray(badges.id, earned));
    const newBadges = missingBadges.filter((badge) => isBadgeMet(badge, progress));
    if (newBadges.length > 0) {
        await tx
            .insert(userBadges)
            .values(newBadges.map((badge) => ({userId, badgeId: badge.id})))
            .onConflictDoNothing();
    }

    return {
        achievements: newAchievements.map(({id, title}) => ({id, title})),
        badges: newBadges.map(({id, name}) => ({id, name})),
    };
}

export type AchievementView = {
    id: number;
    title: string;
    description: string;
    rarity: "common" | "rare" | "epic";
    amount: number;
    reward: {coins: number} | {packTier: PackTier; quantity: number};
    unlocked: boolean;
    claimed: boolean;
};

const RARITY_ORDER = {common: 0, rare: 1, epic: 2} as const;

export async function listAchievements(db: Db, userId: string): Promise<AchievementView[]> {
    const rows = await db
        .select({
            achievement: achievements,
            unlockedAt: userAchievements.unlockedAt,
            claimedAt: userAchievements.claimedAt,
        })
        .from(achievements)
        .leftJoin(
            userAchievements,
            and(eq(userAchievements.achievementId, achievements.id), eq(userAchievements.userId, userId)),
        )
        .orderBy(achievements.id);

    return rows
        .map(({achievement, unlockedAt, claimedAt}) => ({
            id: achievement.id,
            title: achievement.title,
            description: achievement.description,
            rarity: achievement.rarity,
            amount: achievement.amount,
            reward:
                achievement.rewardCoins !== null
                    ? {coins: achievement.rewardCoins}
                    : {
                          packTier: achievement.rewardPackTier as PackTier,
                          quantity: achievement.rewardPackQuantity as number,
                      },
            unlocked: unlockedAt !== null,
            claimed: claimedAt !== null,
        }))
        .sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);
}

/** Grants the reward of an unlocked achievement exactly once, even under concurrent requests. */
export async function claimAchievement(db: Db, userId: string, achievementId: number, now = new Date()) {
    return db.transaction(async (tx) => {
        await tx.select().from(playerState).where(eq(playerState.userId, userId)).for("update");
        const [claimed] = await tx
            .update(userAchievements)
            .set({claimedAt: now})
            .where(
                and(
                    eq(userAchievements.userId, userId),
                    eq(userAchievements.achievementId, achievementId),
                    isNull(userAchievements.claimedAt),
                ),
            )
            .returning();
        if (!claimed) throw new AppError(409, "cannot_claim", "Tej nagrody nie można odebrać");

        const [achievement] = await tx.select().from(achievements).where(eq(achievements.id, achievementId));
        if (achievement.rewardCoins !== null) {
            await changeCoins(tx, userId, achievement.rewardCoins, "achievement", String(achievementId));
        } else {
            await tx
                .insert(packVouchers)
                .values({
                    userId,
                    tier: achievement.rewardPackTier as number,
                    quantity: achievement.rewardPackQuantity as number,
                })
                .onConflictDoUpdate({
                    target: [packVouchers.userId, packVouchers.tier],
                    set: {quantity: sql`${packVouchers.quantity} + ${achievement.rewardPackQuantity}`},
                });
        }
    });
}

export async function hasUnclaimedAchievements(db: Db, userId: string): Promise<boolean> {
    const [row] = await db
        .select({n: count()})
        .from(userAchievements)
        .where(and(eq(userAchievements.userId, userId), isNull(userAchievements.claimedAt)));
    return row.n > 0;
}
