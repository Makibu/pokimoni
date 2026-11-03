import type {Rng} from "@/domain/packs";

/** Deterministic Mulberry32 generator for reproducible random tests. */
export function seededRng(seed: number): Rng {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Returns the given values in order, then repeats the last one. */
export function scriptedRng(values: number[]): Rng {
    let index = 0;
    return () => values[Math.min(index++, values.length - 1)];
}
