import type {MinigameDifficulty} from "../economy";
import type {Rng} from "../packs";
import {type CatalogCard, IllegalMinigameAction, type Outcome} from "./common";
import {createMemory, flipMemory, type MemoryState, type MemoryView, viewMemory} from "./memory";
import {createPuzzle, movePuzzle, type PuzzleState, type PuzzleView, viewPuzzle} from "./sliding-puzzle";
import {answerWhoIsIt, createWhoIsIt, viewWhoIsIt, type WhoIsItState, type WhoIsItView} from "./who-is-it";

export {type CatalogCard, IllegalMinigameAction, type Outcome} from "./common";

export const MINIGAMES = ["who_is_it", "memory", "sliding_puzzle"] as const;
export type Minigame = (typeof MINIGAMES)[number];
export const DIFFICULTIES: readonly MinigameDifficulty[] = ["easy", "medium", "hard"];

export type MinigameVariant = {game: Minigame; difficulty: MinigameDifficulty};

export const MINIGAME_VARIANTS: readonly MinigameVariant[] = MINIGAMES.flatMap((game) =>
    DIFFICULTIES.map((difficulty) => ({game, difficulty})),
);

/** One of the nine variants, never the same as the day before. */
export function pickVariant(previous: MinigameVariant | null, rng: Rng): MinigameVariant {
    const options = MINIGAME_VARIANTS.filter(
        (variant) => !previous || variant.game !== previous.game || variant.difficulty !== previous.difficulty,
    );
    return options[Math.floor(rng() * options.length)];
}

export type MinigameState = WhoIsItState | MemoryState | PuzzleState;
export type MinigameView = WhoIsItView | MemoryView | PuzzleView;

export type MinigameAction =
    {type: "answer"; answer: string} | {type: "flip"; position: number} | {type: "moves"; cells: number[]};

export function createMinigame(variant: MinigameVariant, catalog: readonly CatalogCard[], rng: Rng): MinigameState {
    switch (variant.game) {
        case "who_is_it":
            return createWhoIsIt(catalog, variant.difficulty, rng);
        case "memory":
            return createMemory(catalog, variant.difficulty, rng);
        case "sliding_puzzle":
            return createPuzzle(catalog, variant.difficulty, rng);
    }
}

export function applyAction(state: MinigameState, action: MinigameAction): {state: MinigameState; outcome: Outcome} {
    if (state.game === "who_is_it" && action.type === "answer") return answerWhoIsIt(state, action.answer);
    if (state.game === "memory" && action.type === "flip") return flipMemory(state, action.position);
    if (state.game === "sliding_puzzle" && action.type === "moves") return movePuzzle(state, action.cells);
    throw new IllegalMinigameAction("This action belongs to another game");
}

export function viewOf(state: MinigameState): MinigameView {
    switch (state.game) {
        case "who_is_it":
            return viewWhoIsIt(state);
        case "memory":
            return viewMemory(state);
        case "sliding_puzzle":
            return viewPuzzle(state);
    }
}
