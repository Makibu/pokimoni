import type {Rng} from "./packs";
import {type Rarity, rarityRank} from "./rarity";

export const QUEST_TYPES = [
    "open_packs",
    "open_daily_pack",
    "card_double_rare",
    "card_ultra_rare",
    "new_cards",
    "finish_minigame",
    "collect_piggy",
] as const;

export type QuestType = (typeof QUEST_TYPES)[number];

type PoolEntry = {type: QuestType; target: number; family: string};

/** Every quest can be done alone. One family per day, so a single action does not finish two similar quests. */
export const QUEST_POOL: readonly PoolEntry[] = [
    {type: "open_packs", target: 2, family: "packs"},
    {type: "open_packs", target: 3, family: "packs"},
    {type: "open_daily_pack", target: 1, family: "daily_pack"},
    {type: "card_double_rare", target: 1, family: "rarity"},
    {type: "card_ultra_rare", target: 1, family: "rarity"},
    {type: "new_cards", target: 3, family: "new_cards"},
    {type: "new_cards", target: 5, family: "new_cards"},
    {type: "finish_minigame", target: 1, family: "minigame"},
    {type: "collect_piggy", target: 1, family: "piggy_bank"},
];

/** Draws the given number of quests, each from a different family. */
export function drawQuests(count: number, rng: Rng): {type: QuestType; target: number}[] {
    const drawn: PoolEntry[] = [];
    while (drawn.length < count) {
        const left = QUEST_POOL.filter((entry) => !drawn.some((quest) => quest.family === entry.family));
        if (left.length === 0) throw new Error("Not enough quest families to draw from");
        drawn.push(left[Math.floor(rng() * left.length)]);
    }
    return drawn.map(({type, target}) => ({type, target}));
}

export type QuestEvent =
    | {kind: "pack_opened"; source: "shop" | "daily_pack" | "voucher"; cards: {rarity: Rarity; isNew: boolean}[]}
    | {kind: "minigame_finished"}
    | {kind: "piggy_collected"};

function hasCardOfAtLeast(cards: readonly {rarity: Rarity}[], rarity: Rarity): boolean {
    return cards.some((card) => rarityRank(card.rarity) >= rarityRank(rarity));
}

/** How far an event moves a quest of the given type. */
export function questAdvance(type: QuestType, event: QuestEvent): number {
    switch (type) {
        case "open_packs":
            return event.kind === "pack_opened" ? 1 : 0;
        case "open_daily_pack":
            return event.kind === "pack_opened" && event.source === "daily_pack" ? 1 : 0;
        case "card_double_rare":
            return event.kind === "pack_opened" && hasCardOfAtLeast(event.cards, "double rare") ? 1 : 0;
        case "card_ultra_rare":
            return event.kind === "pack_opened" && hasCardOfAtLeast(event.cards, "ultra rare") ? 1 : 0;
        case "new_cards":
            return event.kind === "pack_opened" ? event.cards.filter((card) => card.isNew).length : 0;
        case "finish_minigame":
            return event.kind === "minigame_finished" ? 1 : 0;
        case "collect_piggy":
            return event.kind === "piggy_collected" ? 1 : 0;
    }
}

export function questTitle(type: QuestType, target: number): string {
    switch (type) {
        case "open_packs":
            return `Otwórz ${target} paczki`;
        case "open_daily_pack":
            return "Otwórz paczkę dnia";
        case "card_double_rare":
            return "Zdobądź kartę Double Rare lub lepszą";
        case "card_ultra_rare":
            return "Zdobądź kartę Ultra Rare lub lepszą";
        case "new_cards":
            return target === 3 ? "Zdobądź 3 nowe karty" : `Zdobądź ${target} nowych kart`;
        case "finish_minigame":
            return "Ukończ minigrę dnia";
        case "collect_piggy":
            return "Odbierz skarbonkę";
    }
}
