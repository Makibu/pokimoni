import {HIT_RARITIES, isRarity, rarityRank} from "@/domain/rarity";
import type {PackSource} from "@/server/services/packs";

export type PackToOpen = {
    setId: string;
    name: string;
    logo: string;
    price: number;
    source: PackSource;
};

/**
 * The ritual, in order. The server has already decided the cards by the time the pack is `sealed`,
 * so everything after that is only presentation and closing the window loses nothing.
 */
export type Stage =
    {name: "offer"} | {name: "sealed"} | {name: "torn"} | {name: "reveal"; index: number} | {name: "summary"};

export type FlowEvent = "bought" | "cut" | "opened" | "next" | "skip";

export function nextStage(stage: Stage, event: FlowEvent, cardCount: number): Stage {
    switch (event) {
        case "bought":
            return stage.name === "offer" || stage.name === "summary" ? {name: "sealed"} : stage;
        case "cut":
            return stage.name === "sealed" ? {name: "torn"} : stage;
        case "opened":
            return stage.name === "torn" ? {name: "reveal", index: 0} : stage;
        case "next":
            if (stage.name !== "reveal") return stage;
            return stage.index + 1 < cardCount ? {name: "reveal", index: stage.index + 1} : {name: "summary"};
        case "skip":
            return stage.name === "offer" || stage.name === "summary" ? stage : {name: "summary"};
    }
}

/** Whether "open another" can be offered. The server still has the final word. */
export function canOpenAgain(pack: PackToOpen, coins: number, vouchers: number): boolean {
    return pack.source === "voucher" ? vouchers > 0 : coins >= pack.price;
}

export type RevealEffect = "none" | "glow" | "shine" | "burst";

export function revealEffect(rarity: string): RevealEffect {
    if (!isRarity(rarity)) return "none";
    if (HIT_RARITIES.includes(rarity)) return "burst";
    if (rarityRank(rarity) >= rarityRank("ultra rare")) return "shine";
    if (rarityRank(rarity) >= rarityRank("rare")) return "glow";
    return "none";
}

/** How long a face-down card waits before flipping: the rarer it is, the longer the anticipation. */
export const FLIP_DELAY_MS: Record<RevealEffect, number> = {none: 250, glow: 400, shine: 600, burst: 900};
