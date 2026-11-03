import {addDays, type GameDay} from "./game-day";

// Values agreed in AUDIT/PRODUCT_SPECIFICATION.md, chapter 4.

export type PackTier = 1 | 2 | 3;

export const STARTING_COINS = 500;
export const MAX_CARD_COPIES = 9;

export const PACK_PRICES: Record<PackTier, number> = {1: 150, 2: 250, 3: 400};
export const DAILY_PACK_DISCOUNT = 0.3;

export function packPrice(tier: PackTier, options: {dailyPack: boolean}): number {
    const base = PACK_PRICES[tier];
    return options.dailyPack ? Math.round(base * (1 - DAILY_PACK_DISCOUNT)) : base;
}

/** Daily reward for streak days 1–7; from day 7 on the reward stays at the last value. */
export const DAILY_REWARDS = [100, 120, 140, 160, 180, 200, 250] as const;
export const MAX_STREAK_DAY = DAILY_REWARDS.length;

export type DailyRewardState = {streakDay: number; lastClaimDay: GameDay | null};

export type DailyClaim = {claimable: false} | {claimable: true; streakDay: number; reward: number};

export function evaluateDailyClaim(state: DailyRewardState, today: GameDay): DailyClaim {
    if (state.lastClaimDay === today) return {claimable: false};
    const continuesStreak = state.lastClaimDay !== null && addDays(state.lastClaimDay, 1) === today;
    const streakDay = continuesStreak ? Math.min(state.streakDay + 1, MAX_STREAK_DAY) : 1;
    return {claimable: true, streakDay, reward: DAILY_REWARDS[streakDay - 1]};
}

export const QUEST_REWARD = 75;
export const QUESTS_PER_DAY = 3;

export type MinigameDifficulty = "easy" | "medium" | "hard";
export const MINIGAME_REWARDS: Record<MinigameDifficulty, number> = {easy: 100, medium: 175, hard: 250};

export const PIGGY_BANK_CAPACITY = 300;
const MS_PER_HOUR = 60 * 60 * 1000;

/** Coins accumulated by income slots since the last collection, capped at the piggy bank capacity. */
export function piggyBankBalance(incomePerHour: number, lastCollectedAt: Date, now: Date): number {
    const elapsedHours = Math.max(0, now.getTime() - lastCollectedAt.getTime()) / MS_PER_HOUR;
    return Math.min(PIGGY_BANK_CAPACITY, Math.floor(incomePerHour * elapsedHours));
}
