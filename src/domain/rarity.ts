/** Card rarities from the most common to the rarest. The order defines rarity rank. */
export const RARITIES = [
    "common",
    "uncommon",
    "rare",
    "double rare",
    "ultra rare",
    "ace spec rare",
    "illustration rare",
    "special illustration rare",
    "hyper rare",
    "secret rare",
] as const;

export type Rarity = (typeof RARITIES)[number];

/** Rarities treated as "hits": boosted in better pack tiers and the only ones in a god pack. */
export const HIT_RARITIES: readonly Rarity[] = [
    "illustration rare",
    "special illustration rare",
    "hyper rare",
    "secret rare",
];

export function rarityRank(rarity: Rarity): number {
    return RARITIES.indexOf(rarity) + 1;
}

export function isRarity(value: string): value is Rarity {
    return (RARITIES as readonly string[]).includes(value);
}

/** Normalizes catalog spelling ("Special Illustration Rare") to a {@link Rarity}. */
export function parseRarity(value: string): Rarity {
    const normalized = value.trim().toLowerCase();
    if (!isRarity(normalized)) throw new Error(`Unknown rarity: ${value}`);
    return normalized;
}
