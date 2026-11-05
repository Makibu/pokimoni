import {describe, expect, it} from "vitest";
import {
    type DayResult,
    earnedOf,
    type Profile,
    type PlayerResult,
    simulatePlayer,
} from "../../helpers/economy-simulation";
import {seededRng} from "../../helpers/rng";

const PLAYERS = 12;
const DAYS = 180;
/** Skips the first weeks, when streak days and first achievements still move the numbers. */
const SETTLED_FROM_DAY = 14;

const OCCASIONAL: Profile = {name: "occasional", tier: 1, collectionsPerDay: 1, winChance: 0.6};
const activeOnTier = (tier: Profile["tier"]): Profile => ({name: "active", tier, collectionsPerDay: 2, winChance: 0.8});

function simulate(profile: Profile): PlayerResult[] {
    return Array.from({length: PLAYERS}, (_, seed) => simulatePlayer(profile, DAYS, seededRng(1000 + seed)));
}

const settledDays = (players: PlayerResult[]) => players.flatMap((player) => player.days.slice(SETTLED_FROM_DAY));

const average = (days: DayResult[], read: (day: DayResult) => number) =>
    days.reduce((sum, day) => sum + read(day), 0) / days.length;

// The bands hold the values measured with the agreed numbers (AUDIT/IMPLEMENTATION_LOG.md, phase 8). They are wider
// than random noise and catch a change in prices, rewards or drop rates. Packs per day sit above the targets in the
// specification's chapter 4, because cards reach about 30 coins/h within days, not the 8-17 it assumed.
describe("economy simulation", {timeout: 60_000}, () => {
    const results = new Map<number, PlayerResult[]>();
    const active = (tier: Profile["tier"]) => {
        if (!results.has(tier)) results.set(tier, simulate(activeOnTier(tier)));
        return results.get(tier)!;
    };

    it("gives an active player the fixed income the specification expects", () => {
        const steady = average(settledDays(active(2)), (day) => day.steady);
        expect(steady).toBeGreaterThan(530);
        expect(steady).toBeLessThan(650);
    });

    it("keeps an active player's daily budget near the agreed maximum", () => {
        const earned = average(settledDays(active(2)), earnedOf);
        expect(earned).toBeGreaterThan(1100);
        expect(earned).toBeLessThan(1300);
    });

    it("gives an occasional player less, but enough for a few packs", () => {
        const days = settledDays(simulate(OCCASIONAL));
        expect(average(days, earnedOf)).toBeGreaterThan(750);
        expect(average(days, earnedOf)).toBeLessThan(1000);
        expect(average(days, (day) => day.packs)).toBeGreaterThan(5);
    });

    it.each([
        [3, 2.5, 4.5],
        [2, 4.5, 7],
        [1, 8, 11.5],
    ] as const)("tier %i packs stay at %d to %d a day", (tier, min, max) => {
        const packs = average(settledDays(active(tier)), (day) => day.packs);
        expect(packs).toBeGreaterThan(min);
        expect(packs).toBeLessThan(max);
    });

    it("never pays more than two full piggy banks to a player collecting twice a day", () => {
        const days = active(2).flatMap((player) => player.days);
        expect(Math.max(...days.map((day) => day.piggy))).toBeLessThanOrEqual(600);
    });

    it("takes months to finish a first set, and most of a year's play leaves the catalog unfinished", () => {
        const players = active(2);
        const finished = players.flatMap((player) => player.firstSetFinishedOnDay ?? []);
        expect(finished.length).toBeGreaterThan(PLAYERS / 2);
        expect(Math.min(...finished)).toBeGreaterThan(30);

        const unique = players.map((player) => player.days.at(-1)!.uniqueCards);
        expect(Math.max(...unique)).toBeLessThan(1500);
    });

    it("gives the same result for the same seed", () => {
        const run = () => simulatePlayer(activeOnTier(2), 30, seededRng(7));
        expect(run()).toEqual(run());
    });
});
