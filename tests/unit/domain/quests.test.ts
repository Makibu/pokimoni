import {describe, expect, it} from "vitest";
import {drawQuests, QUEST_POOL, questAdvance, type QuestEvent, questTitle, QUEST_TYPES} from "@/domain/quests";
import {seededRng} from "../../helpers/rng";

const familyOf = (quest: {type: string; target: number}) =>
    QUEST_POOL.find((entry) => entry.type === quest.type && entry.target === quest.target)?.family;

const pack = (overrides: Partial<Extract<QuestEvent, {kind: "pack_opened"}>> = {}): QuestEvent => ({
    kind: "pack_opened",
    source: "shop",
    cards: [{rarity: "common", isNew: false}],
    ...overrides,
});

describe("drawing quests", () => {
    it("draws the requested number, each from a different family", () => {
        for (let seed = 1; seed <= 200; seed++) {
            const quests = drawQuests(3, seededRng(seed));
            expect(quests).toHaveLength(3);
            expect(new Set(quests.map(familyOf)).size).toBe(3);
        }
    });

    it("can draw every entry of the pool", () => {
        const seen = new Set<string>();
        for (let seed = 1; seed <= 500; seed++) {
            for (const quest of drawQuests(3, seededRng(seed))) seen.add(`${quest.type}:${quest.target}`);
        }
        expect(seen.size).toBe(QUEST_POOL.length);
    });

    it("stops when the pool cannot provide enough families", () => {
        expect(() => drawQuests(99, seededRng(1))).toThrow();
    });

    it("has only quests a player can do alone", () => {
        expect(QUEST_POOL.map((quest) => quest.type).join()).not.toMatch(/trade|friend/);
    });
});

describe("quest progress", () => {
    it("counts every kind of opened pack", () => {
        expect(questAdvance("open_packs", pack({source: "shop"}))).toBe(1);
        expect(questAdvance("open_packs", pack({source: "voucher"}))).toBe(1);
        expect(questAdvance("open_packs", pack({source: "daily_pack"}))).toBe(1);
    });

    it("counts only the daily pack for the daily pack quest", () => {
        expect(questAdvance("open_daily_pack", pack({source: "shop"}))).toBe(0);
        expect(questAdvance("open_daily_pack", pack({source: "daily_pack"}))).toBe(1);
    });

    it("accepts a rarer card than required, but not a more common one", () => {
        const withRarity = (rarity: "rare" | "double rare" | "ultra rare" | "secret rare") =>
            pack({cards: [{rarity, isNew: false}]});
        expect(questAdvance("card_double_rare", withRarity("rare"))).toBe(0);
        expect(questAdvance("card_double_rare", withRarity("double rare"))).toBe(1);
        expect(questAdvance("card_double_rare", withRarity("secret rare"))).toBe(1);
        expect(questAdvance("card_ultra_rare", withRarity("double rare"))).toBe(0);
        expect(questAdvance("card_ultra_rare", withRarity("ultra rare"))).toBe(1);
    });

    it("counts a pack once for a rarity quest, however many such cards it has", () => {
        const cards = [
            {rarity: "ultra rare" as const, isNew: true},
            {rarity: "ultra rare" as const, isNew: true},
        ];
        expect(questAdvance("card_ultra_rare", pack({cards}))).toBe(1);
    });

    it("counts each new card", () => {
        const cards = [
            {rarity: "common" as const, isNew: true},
            {rarity: "common" as const, isNew: false},
            {rarity: "rare" as const, isNew: true},
        ];
        expect(questAdvance("new_cards", pack({cards}))).toBe(2);
    });

    it("ignores events of other kinds", () => {
        expect(questAdvance("finish_minigame", pack())).toBe(0);
        expect(questAdvance("collect_piggy", pack())).toBe(0);
        expect(questAdvance("open_packs", {kind: "piggy_collected"})).toBe(0);
        expect(questAdvance("finish_minigame", {kind: "minigame_finished"})).toBe(1);
        expect(questAdvance("collect_piggy", {kind: "piggy_collected"})).toBe(1);
    });
});

describe("quest titles", () => {
    it("exist for the whole pool, in correct Polish plural forms", () => {
        for (const quest of QUEST_POOL) expect(questTitle(quest.type, quest.target)).not.toBe("");
        expect(questTitle("open_packs", 2)).toBe("Otwórz 2 paczki");
        expect(questTitle("new_cards", 3)).toBe("Zdobądź 3 nowe karty");
        expect(questTitle("new_cards", 5)).toBe("Zdobądź 5 nowych kart");
        expect(QUEST_TYPES).toHaveLength(7);
    });
});
