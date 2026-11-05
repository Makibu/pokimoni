import {describe, expect, it} from "vitest";
import {
    collectionPercent,
    DEFAULT_PROFILE_STATS,
    daysInGame,
    MAX_PROFILE_STATS,
    PROFILE_STAT_LABELS,
    PROFILE_STATS,
} from "@/domain/profile";
import {profileStatEnum} from "@/server/db/schema";

describe("profile statistics", () => {
    it("match the database enum", () => {
        expect([...PROFILE_STATS].sort()).toEqual([...profileStatEnum.enumValues].sort());
    });

    it("all have a label", () => {
        for (const stat of PROFILE_STATS) expect(PROFILE_STAT_LABELS[stat]).toBeTruthy();
    });

    it("default to an allowed number of statistics", () => {
        expect(DEFAULT_PROFILE_STATS.length).toBeLessThanOrEqual(MAX_PROFILE_STATS);
    });
});

describe("daysInGame", () => {
    it("counts the day of registering as the first", () => {
        expect(daysInGame(new Date("2026-11-03T12:00:00Z"), new Date("2026-11-03T13:00:00Z"))).toBe(1);
    });

    it("follows game days, which start at 10:00 Polish time", () => {
        const registered = new Date("2026-11-03T08:59:00Z"); // 09:59 in Warsaw: still the previous game day
        expect(daysInGame(registered, new Date("2026-11-03T09:00:00Z"))).toBe(2);
    });

    it("is not affected by the clock change", () => {
        expect(daysInGame(new Date("2026-10-24T12:00:00Z"), new Date("2026-10-26T12:00:00Z"))).toBe(3);
    });
});

describe("collectionPercent", () => {
    it("rounds to one decimal place", () => {
        expect(collectionPercent(1, 3)).toBe(33.3);
    });

    it("handles an empty catalog", () => {
        expect(collectionPercent(0, 0)).toBe(0);
    });
});
