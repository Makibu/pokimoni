import {and, count, eq} from "drizzle-orm";
import {
    evaluateDailyClaim,
    MAX_STREAK_DAY,
    DAILY_REWARDS,
    PIGGY_BANK_CAPACITY,
    piggyBankBalance,
} from "@/domain/economy";
import {gameDayOf} from "@/domain/game-day";
import {playerState, trades, userCards} from "@/server/db/schema";
import type {Db, Tx} from "@/server/db/types";
import {AppError} from "@/server/http/errors";
import {changeCoins} from "./coins";
import {evaluateProgress, hasUnclaimedAchievements, incomePerHour} from "./progress";

/** Locks the player's row, so concurrent operations of one player run one after another. */
async function lockState(tx: Tx, userId: string) {
    const [state] = await tx.select().from(playerState).where(eq(playerState.userId, userId)).for("update");
    if (!state) throw new AppError(404, "not_found", "Nie znaleziono gracza");
    return state;
}

export type PlayerSummary = {
    coins: number;
    daily: {claimable: boolean; streakDay: number; reward: number};
    piggyBank: {balance: number; capacity: number; incomePerHour: number};
    slots: {slot1CardId: string | null; slot2CardId: string | null};
    hasUnclaimedAchievements: boolean;
};

export async function getPlayerSummary(db: Db, userId: string, now = new Date()): Promise<PlayerSummary> {
    const [state] = await db.select().from(playerState).where(eq(playerState.userId, userId));
    if (!state) throw new AppError(404, "not_found", "Nie znaleziono gracza");

    const claim = evaluateDailyClaim(
        {streakDay: state.streakDay, lastClaimDay: state.lastDailyClaimDay},
        gameDayOf(now),
    );
    const income = await incomePerHour(db, state.slot1CardId, state.slot2CardId);

    return {
        coins: state.coins,
        daily: claim.claimable
            ? {claimable: true, streakDay: claim.streakDay, reward: claim.reward}
            : {
                  claimable: false,
                  streakDay: state.streakDay,
                  reward: DAILY_REWARDS[Math.min(state.streakDay, MAX_STREAK_DAY) - 1] ?? DAILY_REWARDS[0],
              },
        piggyBank: {
            balance: piggyBankBalance(income, state.piggyLastCollectedAt, now),
            capacity: PIGGY_BANK_CAPACITY,
            incomePerHour: income,
        },
        slots: {slot1CardId: state.slot1CardId, slot2CardId: state.slot2CardId},
        hasUnclaimedAchievements: await hasUnclaimedAchievements(db, userId),
    };
}

export async function claimDailyReward(db: Db, userId: string, now = new Date()) {
    const today = gameDayOf(now);
    return db.transaction(async (tx) => {
        const state = await lockState(tx, userId);
        const claim = evaluateDailyClaim({streakDay: state.streakDay, lastClaimDay: state.lastDailyClaimDay}, today);
        if (!claim.claimable) throw new AppError(409, "already_claimed", "Nagroda na dziś została już odebrana");

        await tx
            .update(playerState)
            .set({streakDay: claim.streakDay, lastDailyClaimDay: today})
            .where(eq(playerState.userId, userId));
        const coins = await changeCoins(tx, userId, claim.reward, "daily_reward", today);
        return {coins, reward: claim.reward, streakDay: claim.streakDay};
    });
}

/** Moves the accumulated piggy bank balance to the wallet and restarts accumulation. */
async function settlePiggyBank(tx: Tx, userId: string, state: typeof playerState.$inferSelect, now: Date) {
    const income = await incomePerHour(tx, state.slot1CardId, state.slot2CardId);
    const balance = piggyBankBalance(income, state.piggyLastCollectedAt, now);
    await tx.update(playerState).set({piggyLastCollectedAt: now}).where(eq(playerState.userId, userId));
    if (balance > 0) await changeCoins(tx, userId, balance, "piggy_bank");
    return balance;
}

export async function collectPiggyBank(db: Db, userId: string, now = new Date()) {
    return db.transaction(async (tx) => {
        const state = await lockState(tx, userId);
        const collected = await settlePiggyBank(tx, userId, state, now);
        if (collected === 0) throw new AppError(409, "piggy_bank_empty", "Skarbonka jest pusta");
        return {collected};
    });
}

export type SlotNumber = 1 | 2;

/** Copies of a card that can still be slotted or traded: owned minus slotted minus held in open offers. */
export async function availableCopies(tx: Tx, userId: string, state: typeof playerState.$inferSelect, cardId: string) {
    const [owned] = await tx
        .select({quantity: userCards.quantity})
        .from(userCards)
        .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)));
    if (!owned) return 0;
    const slotted = [state.slot1CardId, state.slot2CardId].filter((id) => id === cardId).length;
    const [{escrowed}] = await tx
        .select({escrowed: count()})
        .from(trades)
        .where(and(eq(trades.fromUserId, userId), eq(trades.offeredCardId, cardId), eq(trades.status, "pending")));
    return owned.quantity - slotted - escrowed;
}

/** Puts a card in an income slot or empties it. Income earned so far is paid out at the old rate first. */
export async function setIncomeSlot(db: Db, userId: string, slot: SlotNumber, cardId: string | null, now = new Date()) {
    return db.transaction(async (tx) => {
        const state = await lockState(tx, userId);
        const column = slot === 1 ? "slot1CardId" : "slot2CardId";

        if (cardId !== null && cardId !== state[column]) {
            if ((await availableCopies(tx, userId, state, cardId)) < 1) {
                throw new AppError(409, "card_unavailable", "Nie masz wolnego egzemplarza tej karty");
            }
        }

        const collected = await settlePiggyBank(tx, userId, state, now);
        await tx
            .update(playerState)
            .set({[column]: cardId})
            .where(eq(playerState.userId, userId));
        const earned = await evaluateProgress(tx, userId);
        return {collected, earned};
    });
}
