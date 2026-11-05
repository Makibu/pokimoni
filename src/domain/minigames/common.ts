import type {Rng} from "../packs";
import type {Rarity} from "../rarity";

export type Outcome = "in_progress" | "won" | "lost";

/** A move the rules do not allow. Only a modified client or a second open tab can send one. */
export class IllegalMinigameAction extends Error {}

export type CatalogCard = {
    id: string;
    name: string;
    rarity: Rarity;
    images: {small: string; large: string};
    subtypes: string[] | null;
};

export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/** Picks items at random, skipping those whose key has already been taken. */
export function pickDistinct<T>(items: readonly T[], count: number, keyOf: (item: T) => string, rng: Rng): T[] {
    const taken = new Set<string>();
    const picked: T[] = [];
    for (const item of shuffled(items, rng)) {
        if (picked.length === count) break;
        const key = keyOf(item);
        if (taken.has(key)) continue;
        taken.add(key);
        picked.push(item);
    }
    if (picked.length < count) throw new Error(`The catalog has too few cards: ${picked.length} of ${count}`);
    return picked;
}
