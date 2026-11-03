import {describe, expect, it} from "vitest";
import {type DailyPackCandidate, dailyPackWeight, pickDailyPack} from "@/domain/daily-pack";
import {seededRng} from "../../helpers/rng";

function shares(candidates: DailyPackCandidate[], timesChosen: Map<string, number>) {
    const rng = seededRng(11);
    const counts = new Map<string, number>();
    const draws = 100_000;
    for (let i = 0; i < draws; i++) {
        const id = pickDailyPack(candidates, timesChosen, rng);
        counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return (id: string) => (counts.get(id) ?? 0) / draws;
}

describe("pickDailyPack", () => {
    it("follows tier weights, independent of the alphabetical order of ids", () => {
        const share = shares(
            [
                {id: "a-best", tier: 3},
                {id: "z-cheap", tier: 1},
            ],
            new Map(),
        );
        expect(share("z-cheap")).toBeCloseTo(3 / 4, 2);
        expect(share("a-best")).toBeCloseTo(1 / 4, 2);
    });

    it("lowers the chance of recently repeated sets", () => {
        const share = shares(
            [
                {id: "fresh", tier: 1},
                {id: "repeated", tier: 1},
            ],
            new Map([["repeated", 2]]),
        );
        expect(share("fresh")).toBeCloseTo(3 / 4, 2);
    });

    it("rejects an empty list", () => {
        expect(() => pickDailyPack([], new Map(), () => 0)).toThrow();
    });
});

describe("dailyPackWeight", () => {
    it("favors cheaper tiers and fewer appearances", () => {
        expect(dailyPackWeight(1, 0)).toBe(3);
        expect(dailyPackWeight(3, 0)).toBe(1);
        expect(dailyPackWeight(1, 2)).toBe(1);
    });
});
