import {describe, expect, it} from "vitest";
import {
    DAILY_REWARDS,
    evaluateDailyClaim,
    PIGGY_BANK_CAPACITY,
    packPrice,
    piggyBankBalance,
} from "@/domain/economy";

describe("packPrice", () => {
    it("charges more for better tiers", () => {
        expect([1, 2, 3].map((tier) => packPrice(tier as 1 | 2 | 3, {dailyPack: false}))).toEqual([150, 250, 400]);
    });

    it("applies the 30% daily pack discount", () => {
        expect(packPrice(1, {dailyPack: true})).toBe(105);
        expect(packPrice(2, {dailyPack: true})).toBe(175);
        expect(packPrice(3, {dailyPack: true})).toBe(280);
    });
});

describe("evaluateDailyClaim", () => {
    it("starts a streak on the first claim", () => {
        expect(evaluateDailyClaim({streakDay: 0, lastClaimDay: null}, "2026-11-03")).toEqual({
            claimable: true,
            streakDay: 1,
            reward: 100,
        });
    });

    it("rejects a second claim on the same game day", () => {
        expect(evaluateDailyClaim({streakDay: 3, lastClaimDay: "2026-11-03"}, "2026-11-03")).toEqual({
            claimable: false,
        });
    });

    it("continues the streak on the next day", () => {
        expect(evaluateDailyClaim({streakDay: 3, lastClaimDay: "2026-11-02"}, "2026-11-03")).toMatchObject({
            streakDay: 4,
            reward: DAILY_REWARDS[3],
        });
    });

    it("caps the streak at day 7 and keeps the top reward", () => {
        expect(evaluateDailyClaim({streakDay: 7, lastClaimDay: "2026-11-02"}, "2026-11-03")).toMatchObject({
            streakDay: 7,
            reward: 250,
        });
    });

    it("resets the streak after a missed day", () => {
        expect(evaluateDailyClaim({streakDay: 6, lastClaimDay: "2026-11-01"}, "2026-11-03")).toMatchObject({
            streakDay: 1,
            reward: 100,
        });
    });
});

describe("piggyBankBalance", () => {
    const start = new Date("2026-11-03T10:00:00Z");
    const hoursLater = (hours: number) => new Date(start.getTime() + hours * 3_600_000);

    it("accrues income per hour, rounded down", () => {
        expect(piggyBankBalance(17, start, hoursLater(2.5))).toBe(42);
    });

    it("stops at the capacity", () => {
        expect(piggyBankBalance(50, start, hoursLater(24 * 180))).toBe(PIGGY_BANK_CAPACITY);
    });

    it("is zero without income or when the clock goes backwards", () => {
        expect(piggyBankBalance(0, start, hoursLater(10))).toBe(0);
        expect(piggyBankBalance(20, start, hoursLater(-1))).toBe(0);
    });
});
