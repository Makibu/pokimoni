import {describe, expect, it} from "vitest";
import {achievementValue, isAchievementMet, isBadgeMet, type PlayerProgress} from "@/domain/progress";

const progress: PlayerProgress = {
    uniqueCards: 120,
    totalCards: 300,
    catalogCards: 3169,
    packsOpened: 60,
    incomePerHour: 24,
    copiesByRarity: {rare: 30, "ultra rare": 5, "hyper rare": 2, "secret rare": 1},
};

describe("achievementValue", () => {
    it.each([
        ["cards_overall", 120],
        ["cards_duplicates", 300],
        ["packs_overall", 60],
        ["cards_rarity_rare", 30],
        ["cards_rarity_ultra_rare", 5],
        ["cards_rarity_ultra_rare_plus", 8],
        ["cards_rarity_hyper_rare_plus", 3],
        ["cards_rarity_secret_rare", 1],
        ["cards_rarity_double_rare", 0],
    ])("%s = %i", (type, expected) => {
        expect(achievementValue(type, progress)).toBe(expected);
    });

    it("returns null for unknown types", () => {
        expect(achievementValue("cards_rarity_shiny", progress)).toBeNull();
        expect(achievementValue("something_else", progress)).toBeNull();
    });
});

describe("isAchievementMet", () => {
    it("compares the counter with the required amount", () => {
        expect(isAchievementMet({type: "packs_overall", amount: 60}, progress)).toBe(true);
        expect(isAchievementMet({type: "packs_overall", amount: 61}, progress)).toBe(false);
    });

    it("never unlocks an unknown type", () => {
        expect(isAchievementMet({type: "nope", amount: 0}, progress)).toBe(false);
    });
});

describe("isBadgeMet", () => {
    it.each([
        ["cards", 300, true],
        ["cards", 301, false],
        ["packs", 60, true],
        ["income_per_hour", 30, false],
        ["income_per_hour", 24, true],
        ["secret_rare_cards", 1, true],
        ["secret_rare_cards", 3, false],
        ["special_illustration_plus_cards", 3, true],
        ["special_illustration_plus_cards", 4, false],
    ])("%s with amount %i is %s", (unit, amount, expected) => {
        expect(isBadgeMet({unit, amount}, progress)).toBe(expected);
    });

    it("requires every catalog card for the full collection badge", () => {
        expect(isBadgeMet({unit: "all_cards", amount: null}, progress)).toBe(false);
        expect(isBadgeMet({unit: "all_cards", amount: null}, {...progress, uniqueCards: 3169})).toBe(true);
    });

    it("ignores unknown units", () => {
        expect(isBadgeMet({unit: "nope", amount: 0}, progress)).toBe(false);
    });
});
