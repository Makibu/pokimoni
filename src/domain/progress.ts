import {RARITIES, type Rarity, rarityRank} from "./rarity";

/** Snapshot of a player's progress, the only input of achievement and badge rules. */
export type PlayerProgress = {
    uniqueCards: number;
    totalCards: number;
    catalogCards: number;
    packsOpened: number;
    incomePerHour: number;
    copiesByRarity: Partial<Record<Rarity, number>>;
};

function copiesOf(progress: PlayerProgress, rarity: Rarity): number {
    return progress.copiesByRarity[rarity] ?? 0;
}

function copiesAtLeast(progress: PlayerProgress, rarity: Rarity): number {
    return RARITIES.filter((other) => rarityRank(other) >= rarityRank(rarity)).reduce(
        (sum, other) => sum + copiesOf(progress, other),
        0,
    );
}

const RARITY_TYPE_PREFIX = "cards_rarity_";
const PLUS_SUFFIX = "_plus";

/** Reads types like `cards_rarity_ultra_rare` or `cards_rarity_hyper_rare_plus`. */
function parseRarityType(type: string): {rarity: Rarity; plus: boolean} | null {
    if (!type.startsWith(RARITY_TYPE_PREFIX)) return null;
    const rest = type.slice(RARITY_TYPE_PREFIX.length);
    const plus = rest.endsWith(PLUS_SUFFIX);
    const name = (plus ? rest.slice(0, -PLUS_SUFFIX.length) : rest).replaceAll("_", " ");
    const rarity = RARITIES.find((candidate) => candidate === name);
    return rarity ? {rarity, plus} : null;
}

/** Current value of an achievement's counter, or null for an unknown achievement type. */
export function achievementValue(type: string, progress: PlayerProgress): number | null {
    switch (type) {
        case "cards_overall":
            return progress.uniqueCards;
        case "cards_duplicates":
            return progress.totalCards;
        case "packs_overall":
            return progress.packsOpened;
    }
    const parsed = parseRarityType(type);
    if (!parsed) return null;
    return parsed.plus ? copiesAtLeast(progress, parsed.rarity) : copiesOf(progress, parsed.rarity);
}

export function isAchievementMet(achievement: {type: string; amount: number}, progress: PlayerProgress): boolean {
    const value = achievementValue(achievement.type, progress);
    return value !== null && value >= achievement.amount;
}

export function isBadgeMet(badge: {unit: string; amount: number | null}, progress: PlayerProgress): boolean {
    const amount = badge.amount ?? Infinity;
    switch (badge.unit) {
        case "cards":
            return progress.totalCards >= amount;
        case "all_cards":
            return progress.catalogCards > 0 && progress.uniqueCards >= progress.catalogCards;
        case "packs":
            return progress.packsOpened >= amount;
        case "income_per_hour":
            return progress.incomePerHour >= amount;
        case "secret_rare_cards":
            return copiesOf(progress, "secret rare") >= amount;
        case "special_illustration_plus_cards":
            return copiesAtLeast(progress, "special illustration rare") >= amount;
        default:
            return false;
    }
}
