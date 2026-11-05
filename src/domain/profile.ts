import {gameDayOf} from "./game-day";

export const PROFILE_STATS = [
    "unique_cards",
    "collection_percent",
    "packs_opened",
    "achievements",
    "badges",
    "completed_sets",
    "rarest_card",
    "favorite_set",
    "trades",
    "income_per_hour",
    "days_in_game",
] as const;

export type ProfileStat = (typeof PROFILE_STATS)[number];

export const PROFILE_STAT_LABELS: Record<ProfileStat, string> = {
    unique_cards: "Unikatowe karty",
    collection_percent: "Ukończenie kolekcji",
    packs_opened: "Otwarte paczki",
    achievements: "Osiągnięcia",
    badges: "Odznaki",
    completed_sets: "Ukończone zestawy",
    rarest_card: "Najrzadsza karta",
    favorite_set: "Ulubiony zestaw",
    trades: "Wymiany",
    income_per_hour: "Dochód na godzinę",
    days_in_game: "Dni w grze",
};

export const MAX_PROFILE_STATS = 3;
export const MAX_SHOWCASE_CARDS = 5;

/** Shown until the player picks their own. */
export const DEFAULT_PROFILE_STATS: ProfileStat[] = ["unique_cards", "packs_opened", "achievements"];

const DAY_MS = 86_400_000;

/** Game days since registering, counting the first one. */
export function daysInGame(createdAt: Date, now: Date): number {
    return (Date.parse(gameDayOf(now)) - Date.parse(gameDayOf(createdAt))) / DAY_MS + 1;
}

/** Share of the catalog, to one decimal place. */
export function collectionPercent(uniqueCards: number, catalogCards: number): number {
    return catalogCards === 0 ? 0 : Math.round((uniqueCards / catalogCards) * 1000) / 10;
}
