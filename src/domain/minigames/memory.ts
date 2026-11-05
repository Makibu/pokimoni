import type {MinigameDifficulty} from "../economy";
import type {Rng} from "../packs";
import {type CatalogCard, IllegalMinigameAction, type Outcome, pickDistinct, shuffled} from "./common";

export const MEMORY_PAIRS: Record<MinigameDifficulty, number> = {easy: 6, medium: 8, hard: 12};
/** Careful play on 12 pairs needs about 8–15 mistakes, so the limit asks for attention but stays fair. */
export const MEMORY_MISTAKE_LIMIT = 15;

type MemoryCard = {name: string; image: string};

export type MemoryState = {
    game: "memory";
    difficulty: MinigameDifficulty;
    cards: MemoryCard[];
    /** Index in `cards` for every position on the table. */
    deck: number[];
    matched: boolean[];
    /** Positions showing their face: one waiting for a pair, or two that did not match. */
    open: number[];
    mistakes: number;
};

export type MemoryPosition = {status: "hidden"} | {status: "open" | "matched"; name: string; image: string};

export type MemoryView = {
    game: "memory";
    difficulty: MinigameDifficulty;
    positions: MemoryPosition[];
    /** Two open positions that did not match; they turn back on the next flip. */
    mismatch: boolean;
    mistakes: number;
    mistakeLimit: number | null;
};

function mistakeLimit(difficulty: MinigameDifficulty): number | null {
    return difficulty === "hard" ? MEMORY_MISTAKE_LIMIT : null;
}

export function createMemory(catalog: readonly CatalogCard[], difficulty: MinigameDifficulty, rng: Rng): MemoryState {
    const pairs = MEMORY_PAIRS[difficulty];
    const cards = pickDistinct(catalog, pairs, (card) => card.name, rng).map((card) => ({
        name: card.name,
        image: card.images.small,
    }));
    const deck = shuffled(
        cards.flatMap((_, index) => [index, index]),
        rng,
    );
    return {
        game: "memory",
        difficulty,
        cards,
        deck,
        matched: deck.map(() => false),
        open: [],
        mistakes: 0,
    };
}

export function flipMemory(state: MemoryState, position: number): {state: MemoryState; outcome: Outcome} {
    if (!Number.isInteger(position) || position < 0 || position >= state.deck.length) {
        throw new IllegalMinigameAction("No such position");
    }
    if (state.matched[position]) throw new IllegalMinigameAction("This pair is already found");

    // A shown mismatch turns back as soon as the player moves on.
    const open = state.open.length === 2 ? [] : state.open;
    if (open.includes(position)) throw new IllegalMinigameAction("This card is already open");

    if (open.length === 0) return {state: {...state, open: [position]}, outcome: "in_progress"};

    const first = open[0];
    if (state.deck[first] === state.deck[position]) {
        const matched = state.matched.map((value, index) => value || index === first || index === position);
        return {
            state: {...state, matched, open: []},
            outcome: matched.every(Boolean) ? "won" : "in_progress",
        };
    }

    const mistakes = state.mistakes + 1;
    const limit = mistakeLimit(state.difficulty);
    return {
        state: {...state, open: [first, position], mistakes},
        outcome: limit !== null && mistakes >= limit ? "lost" : "in_progress",
    };
}

/** Only cards the player has legitimately turned are described. The rest stay unknown to the client. */
export function viewMemory(state: MemoryState): MemoryView {
    return {
        game: "memory",
        difficulty: state.difficulty,
        positions: state.deck.map((cardIndex, position): MemoryPosition => {
            const isMatched = state.matched[position];
            if (!isMatched && !state.open.includes(position)) return {status: "hidden"};
            const {name, image} = state.cards[cardIndex];
            return {status: isMatched ? "matched" : "open", name, image};
        }),
        mismatch: state.open.length === 2,
        mistakes: state.mistakes,
        mistakeLimit: mistakeLimit(state.difficulty),
    };
}
