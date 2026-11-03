import {describe, expect, it} from "vitest";
import {MAX_CARD_COPIES} from "@/domain/economy";
import {drawPack, GOD_PACK_CHANCE, PACK_SIZE, type PackCard, resolveDrawnCards, slotWeights} from "@/domain/packs";
import {HIT_RARITIES, RARITIES, type Rarity} from "@/domain/rarity";
import {scriptedRng, seededRng} from "../../helpers/rng";

/** A set with three cards of every rarity. */
const fullSet: PackCard[] = RARITIES.flatMap((rarity) =>
    [1, 2, 3].map((n) => ({id: `${rarity.replaceAll(" ", "-")}-${n}`, rarity})),
);

function rarityShares(position: number, tier: 1 | 2 | 3, packs: number, seed: number) {
    const rng = seededRng(seed);
    const counts = new Map<Rarity, number>();
    for (let i = 0; i < packs; i++) {
        const {cards} = drawPack(fullSet, tier, rng);
        const rarity = cards[position].rarity;
        counts.set(rarity, (counts.get(rarity) ?? 0) + 1);
    }
    return (rarity: Rarity) => (counts.get(rarity) ?? 0) / packs;
}

describe("drawPack", () => {
    it("always returns five cards from the set", () => {
        const {cards} = drawPack(fullSet, 1, seededRng(1));
        expect(cards).toHaveLength(PACK_SIZE);
        for (const card of cards) expect(fullSet).toContain(card);
    });

    it("matches the filler slot weights over 100k packs", () => {
        const share = rarityShares(0, 1, 100_000, 42);
        const weights = slotWeights(0, 1);
        const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
        expect(share("common")).toBeCloseTo(weights.common! / total, 2);
        expect(share("uncommon")).toBeCloseTo(weights.uncommon! / total, 2);
        expect(share("rare")).toBeCloseTo(weights.rare! / total, 2);
    });

    it("never puts commons in the last two slots", () => {
        const rng = seededRng(7);
        for (let i = 0; i < 10_000; i++) {
            const {cards, isGodPack} = drawPack(fullSet, 1, rng);
            if (isGodPack) continue;
            expect(cards[3].rarity).not.toBe("common");
            expect(cards[4].rarity).not.toBe("common");
            expect(cards[4].rarity).not.toBe("uncommon");
        }
    });

    it("gives better tiers more hits in the last slot", () => {
        const hitShare = (tier: 1 | 2 | 3) => {
            const share = rarityShares(4, tier, 50_000, 99);
            return HIT_RARITIES.reduce((sum, rarity) => sum + share(rarity), 0);
        };
        const [tier1, tier2, tier3] = [hitShare(1), hitShare(2), hitShare(3)];
        expect(tier2).toBeGreaterThan(tier1);
        expect(tier3).toBeGreaterThan(tier2);
    });

    it("draws god packs at about 0.05%", () => {
        const rng = seededRng(2024);
        const packs = 400_000;
        let godPacks = 0;
        for (let i = 0; i < packs; i++) if (drawPack(fullSet, 1, rng).isGodPack) godPacks++;
        expect(godPacks / packs).toBeGreaterThan(GOD_PACK_CHANCE * 0.7);
        expect(godPacks / packs).toBeLessThan(GOD_PACK_CHANCE * 1.3);
    });

    it("fills a god pack only with hit rarities", () => {
        const {cards, isGodPack} = drawPack(fullSet, 1, scriptedRng([0, 0.5]));
        expect(isGodPack).toBe(true);
        for (const card of cards) expect(HIT_RARITIES).toContain(card.rarity);
    });

    it("redistributes weight when the set lacks a rarity", () => {
        const noCommons = fullSet.filter((card) => card.rarity !== "common");
        const rng = seededRng(5);
        for (let i = 0; i < 2_000; i++) {
            for (const card of drawPack(noCommons, 1, rng).cards) expect(card.rarity).not.toBe("common");
        }
    });

    it("falls back to any card when no weighted rarity exists in the set", () => {
        const onlyCommons: PackCard[] = [{id: "c-1", rarity: "common"}];
        const {cards} = drawPack(onlyCommons, 1, seededRng(3));
        expect(cards.map((card) => card.id)).toEqual(Array(PACK_SIZE).fill("c-1"));
    });
});

describe("resolveDrawnCards", () => {
    it("marks first copies of unowned cards as new", () => {
        expect(resolveDrawnCards(["a", "a", "b"], new Map([["b", 2]]))).toEqual([
            {cardId: "a", isNew: true, overLimit: false},
            {cardId: "a", isNew: false, overLimit: false},
            {cardId: "b", isNew: false, overLimit: false},
        ]);
    });

    it("marks copies above the limit, also within one pack", () => {
        const owned = new Map([["a", MAX_CARD_COPIES - 1]]);
        expect(resolveDrawnCards(["a", "a", "a"], owned)).toEqual([
            {cardId: "a", isNew: false, overLimit: false},
            {cardId: "a", isNew: false, overLimit: true},
            {cardId: "a", isNew: false, overLimit: true},
        ]);
    });
});
