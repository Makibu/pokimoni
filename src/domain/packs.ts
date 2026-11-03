import {MAX_CARD_COPIES, type PackTier} from "./economy";
import {HIT_RARITIES, RARITIES, type Rarity} from "./rarity";

/** Random number generator returning values in [0, 1). Injected so draws are testable. */
export type Rng = () => number;

export const PACK_SIZE = 5;
export const GOD_PACK_CHANCE = 0.0005;

type Weights = Partial<Record<Rarity, number>>;

const FILLER_SLOT: Weights = {
    common: 80,
    uncommon: 15,
    rare: 4,
    "double rare": 0.5,
    "ultra rare": 0.3,
    "ace spec rare": 0.1,
    "illustration rare": 0.05,
    "special illustration rare": 0.05,
    "hyper rare": 0.01,
    "secret rare": 0.01,
};

const FOURTH_SLOT: Weights = {
    uncommon: 20,
    rare: 40,
    "double rare": 20,
    "ultra rare": 10,
    "ace spec rare": 5,
    "illustration rare": 3,
    "special illustration rare": 2,
    "hyper rare": 0.5,
    "secret rare": 0.5,
};

const FIFTH_SLOT: Weights = {
    rare: 40,
    "double rare": 30,
    "ultra rare": 15,
    "ace spec rare": 5,
    "illustration rare": 4.5,
    "special illustration rare": 3,
    "hyper rare": 2,
    "secret rare": 0.5,
};

const SLOT_WEIGHTS: readonly Weights[] = [FILLER_SLOT, FILLER_SLOT, FILLER_SLOT, FOURTH_SLOT, FIFTH_SLOT];

/** Better pack tiers multiply the chance of hit rarities in the last two slots. */
export const TIER_HIT_MULTIPLIER: Record<PackTier, number> = {1: 1, 2: 1.5, 3: 2.5};

export function slotWeights(position: number, tier: PackTier): Weights {
    const base = SLOT_WEIGHTS[position];
    if (!base) throw new Error(`Invalid pack position: ${position}`);
    if (position < 3) return base;
    const weights: Weights = {};
    for (const rarity of RARITIES) {
        const weight = base[rarity];
        if (weight === undefined) continue;
        weights[rarity] = HIT_RARITIES.includes(rarity) ? weight * TIER_HIT_MULTIPLIER[tier] : weight;
    }
    return weights;
}

export type PackCard = {id: string; rarity: Rarity};

export type DrawnPack<T extends PackCard> = {cards: T[]; isGodPack: boolean};

/**
 * Draws a pack: for each slot a rarity is picked by weight among the rarities present in the set,
 * then a card of that rarity uniformly. A god pack contains only hit rarities.
 */
export function drawPack<T extends PackCard>(setCards: readonly T[], tier: PackTier, rng: Rng): DrawnPack<T> {
    if (setCards.length === 0) throw new Error("Cannot draw a pack from an empty set");

    const byRarity = new Map<Rarity, T[]>();
    for (const card of setCards) {
        const group = byRarity.get(card.rarity);
        if (group) group.push(card);
        else byRarity.set(card.rarity, [card]);
    }

    const availableHits = HIT_RARITIES.filter((rarity) => byRarity.has(rarity));
    const isGodPack = availableHits.length > 0 && rng() < GOD_PACK_CHANCE;
    const godPackWeights: Weights = Object.fromEntries(availableHits.map((rarity) => [rarity, 1]));

    const cards: T[] = [];
    for (let position = 0; position < PACK_SIZE; position++) {
        const weights = isGodPack ? godPackWeights : slotWeights(position, tier);
        const rarity = pickRarity(weights, byRarity, rng);
        const pool = rarity ? byRarity.get(rarity)! : setCards;
        cards.push(pool[Math.floor(rng() * pool.length)]);
    }
    return {cards, isGodPack};
}

function pickRarity(weights: Weights, available: ReadonlyMap<Rarity, unknown>, rng: Rng): Rarity | null {
    const candidates = RARITIES.filter((rarity) => available.has(rarity) && (weights[rarity] ?? 0) > 0);
    if (candidates.length === 0) return null;
    const total = candidates.reduce((sum, rarity) => sum + weights[rarity]!, 0);
    let roll = rng() * total;
    for (const rarity of candidates) {
        roll -= weights[rarity]!;
        if (roll < 0) return rarity;
    }
    return candidates[candidates.length - 1];
}

export type ResolvedCard = {cardId: string; isNew: boolean; overLimit: boolean};

/**
 * Applies the copy limit to drawn cards in order. A copy above {@link MAX_CARD_COPIES} is marked
 * `overLimit` and must not be added to the collection. `isNew` marks the first copy of a card the
 * player did not own before the pack.
 */
export function resolveDrawnCards(drawnIds: readonly string[], owned: ReadonlyMap<string, number>): ResolvedCard[] {
    const counts = new Map(owned);
    return drawnIds.map((cardId) => {
        const before = counts.get(cardId) ?? 0;
        const overLimit = before >= MAX_CARD_COPIES;
        if (!overLimit) counts.set(cardId, before + 1);
        return {cardId, isNew: before === 0, overLimit};
    });
}
