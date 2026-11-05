import type {MinigameDifficulty} from "../economy";
import type {Rng} from "../packs";
import {HIT_RARITIES} from "../rarity";
import {type CatalogCard, IllegalMinigameAction, type Outcome} from "./common";

export const PUZZLE_SIZES: Record<MinigameDifficulty, number> = {easy: 3, medium: 4, hard: 5};
const GAP = 0;
const SHUFFLE_MOVES_PER_CELL = 20;

export type PuzzleState = {
    game: "sliding_puzzle";
    difficulty: MinigameDifficulty;
    size: number;
    /** Tile number on every cell, row by row. Tile n belongs on cell n - 1; 0 is the gap, last when solved. */
    tiles: number[];
    moves: number;
    image: string;
    name: string;
};

/** Nothing here is secret: the board and the picture are the whole game. */
export type PuzzleView = PuzzleState;

export function solvedTiles(size: number): number[] {
    const cells = size * size;
    return Array.from({length: cells}, (_, index) => (index + 1) % cells);
}

export function isSolved(tiles: readonly number[]): boolean {
    return tiles.every((tile, index) => tile === (index + 1) % tiles.length);
}

/** Cells next to the given one, in the four directions. */
export function neighbours(cell: number, size: number): number[] {
    const row = Math.floor(cell / size);
    const column = cell % size;
    const result: number[] = [];
    if (row > 0) result.push(cell - size);
    if (row < size - 1) result.push(cell + size);
    if (column > 0) result.push(cell - 1);
    if (column < size - 1) result.push(cell + 1);
    return result;
}

/** Slides the tile on a cell into the gap, or returns null when they are not neighbours. */
export function slideTile(tiles: readonly number[], size: number, cell: number): number[] | null {
    const gap = tiles.indexOf(GAP);
    if (!neighbours(gap, size).includes(cell)) return null;
    const next = [...tiles];
    next[gap] = next[cell];
    next[cell] = GAP;
    return next;
}

/** Shuffles by legal moves from the solved board, so every generated puzzle can be solved. */
export function shuffleTiles(size: number, rng: Rng): number[] {
    let tiles = solvedTiles(size);
    let previousGap = -1;
    const moves = size * size * SHUFFLE_MOVES_PER_CELL;
    do {
        for (let i = 0; i < moves; i++) {
            const gap = tiles.indexOf(GAP);
            const options = neighbours(gap, size).filter((cell) => cell !== previousGap);
            const cell = options[Math.floor(rng() * options.length)];
            tiles = slideTile(tiles, size, cell) as number[];
            previousGap = gap;
        }
    } while (isSolved(tiles));
    return tiles;
}

export function createPuzzle(catalog: readonly CatalogCard[], difficulty: MinigameDifficulty, rng: Rng): PuzzleState {
    // Full-art cards make the best pictures, and their tiles are easier to tell apart than rules text.
    const pictures = catalog.filter((card) => HIT_RARITIES.includes(card.rarity));
    const source = pictures.length > 0 ? pictures : catalog;
    if (source.length === 0) throw new Error("The catalog has no cards");
    const card = source[Math.floor(rng() * source.length)];
    const size = PUZZLE_SIZES[difficulty];
    return {
        game: "sliding_puzzle",
        difficulty,
        size,
        tiles: shuffleTiles(size, rng),
        moves: 0,
        image: card.images.large,
        name: card.name,
    };
}

/** Replays moves one by one, so a board can only be reached the legal way. An illegal move rejects them all. */
export function movePuzzle(state: PuzzleState, cells: readonly number[]): {state: PuzzleState; outcome: Outcome} {
    let tiles = state.tiles;
    let moves = state.moves;
    for (const cell of cells) {
        if (isSolved(tiles)) throw new IllegalMinigameAction("The puzzle is already solved");
        const next = slideTile(tiles, state.size, cell);
        if (!next) throw new IllegalMinigameAction("This tile cannot move");
        tiles = next;
        moves++;
    }
    return {state: {...state, tiles, moves}, outcome: isSolved(tiles) ? "won" : "in_progress"};
}

export function viewPuzzle(state: PuzzleState): PuzzleView {
    return state;
}
