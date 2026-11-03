import type {PackTier} from "./economy";
import type {Rng} from "./packs";

export type DailyPackCandidate = {id: string; tier: PackTier};

/** Selection weight: cheaper tiers appear more often, and every past appearance lowers the chance. */
export function dailyPackWeight(tier: PackTier, timesChosen: number): number {
    return (4 - tier) / (timesChosen + 1);
}

/** Weighted random pick of the set discounted on a given game day. */
export function pickDailyPack(
    candidates: readonly DailyPackCandidate[],
    timesChosen: ReadonlyMap<string, number>,
    rng: Rng,
): string {
    if (candidates.length === 0) throw new Error("No sets to choose the daily pack from");
    const weights = candidates.map((set) => dailyPackWeight(set.tier, timesChosen.get(set.id) ?? 0));
    let roll = rng() * weights.reduce((sum, weight) => sum + weight, 0);
    for (let i = 0; i < candidates.length; i++) {
        roll -= weights[i];
        if (roll < 0) return candidates[i].id;
    }
    return candidates[candidates.length - 1].id;
}
