import {describe, expect, it} from "vitest";
import {
    applyAction,
    type CatalogCard,
    createMinigame,
    IllegalMinigameAction,
    MINIGAME_VARIANTS,
    pickVariant,
    viewOf,
} from "@/domain/minigames";
import {
    createMemory,
    flipMemory,
    MEMORY_MISTAKE_LIMIT,
    MEMORY_PAIRS,
    type MemoryState,
    viewMemory,
} from "@/domain/minigames/memory";
import {
    createPuzzle,
    isSolved,
    movePuzzle,
    neighbours,
    PUZZLE_SIZES,
    type PuzzleState,
    shuffleTiles,
    slideTile,
    solvedTiles,
} from "@/domain/minigames/sliding-puzzle";
import {
    acceptedNames,
    answerWhoIsIt,
    createWhoIsIt,
    currentClue,
    isCorrectGuess,
    isPokemonCard,
    normalizeName,
    pokemonName,
    viewWhoIsIt,
    WHO_IS_IT_ROUNDS,
    type WhoIsItState,
} from "@/domain/minigames/who-is-it";
import {seededRng} from "../../helpers/rng";

const SPECIES = "Alpha Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliet Kilo Lima Mike November".split(" ");

const catalog: CatalogCard[] = [
    ...SPECIES.map((name, index): CatalogCard => ({
        id: `pokemon-${index}`,
        name,
        rarity: index % 2 === 0 ? "illustration rare" : "common",
        images: {small: `https://img/${index}.png`, large: `https://img/${index}_hires.png`},
        subtypes: ["Basic"],
    })),
    {
        id: "trainer",
        name: "Iono",
        rarity: "common",
        images: {small: "https://img/t.png", large: "https://img/t_hires.png"},
        subtypes: ["Supporter"],
    },
    {
        id: "energy",
        name: "Basic Fire Energy",
        rarity: "common",
        images: {small: "https://img/e.png", large: "https://img/e_hires.png"},
        subtypes: ["Basic"],
    },
];

describe("the day's variant", () => {
    it("offers three games on three levels", () => {
        expect(MINIGAME_VARIANTS).toHaveLength(9);
        expect(new Set(MINIGAME_VARIANTS.map((v) => `${v.game}/${v.difficulty}`)).size).toBe(9);
    });

    it("never repeats yesterday's variant, and reaches all the others", () => {
        const previous = MINIGAME_VARIANTS[4];
        const seen = new Set<string>();
        for (let seed = 1; seed <= 500; seed++) {
            const variant = pickVariant(previous, seededRng(seed));
            expect(variant).not.toEqual(previous);
            seen.add(`${variant.game}/${variant.difficulty}`);
        }
        expect(seen.size).toBe(8);
    });

    it("works on the very first day", () => {
        expect(MINIGAME_VARIANTS).toContainEqual(pickVariant(null, seededRng(1)));
    });
});

describe("Kto to Pokémon: names", () => {
    it("recognises Pokémon cards", () => {
        expect(isPokemonCard({name: "Sewaddle", subtypes: ["Basic"]})).toBe(true);
        expect(isPokemonCard({name: "Charizard ex", subtypes: ["Stage 2", "ex"]})).toBe(true);
        expect(isPokemonCard({name: "Iono", subtypes: ["Supporter"]})).toBe(false);
        expect(isPokemonCard({name: "Basic Fire Energy", subtypes: ["Basic"]})).toBe(false);
        expect(isPokemonCard({name: "Unknown", subtypes: null})).toBe(false);
    });

    it("takes the Pokémon out of a card's name", () => {
        expect(pokemonName("Charizard ex")).toBe("Charizard");
        expect(pokemonName("Team Rocket's Nidoking ex")).toBe("Nidoking");
        expect(pokemonName("Cynthia's Gible")).toBe("Gible");
        expect(pokemonName("Iron Valiant ex")).toBe("Iron Valiant");
    });

    it("ignores case, accents and punctuation", () => {
        expect(normalizeName("Flabébé")).toBe("flabebe");
        expect(normalizeName("Mr. Mime")).toBe("mrmime");
        expect(normalizeName("Nidoran ♀")).toBe("nidoran");
    });

    it("accepts a species without its regional form", () => {
        expect(acceptedNames("Paldean Wooper")).toEqual(["paldeanwooper", "wooper"]);
        expect(acceptedNames("Teal Mask Ogerpon ex")).toEqual(["tealmaskogerpon", "ogerpon"]);
        expect(acceptedNames("Castform Sunny Form")).toEqual(["castformsunnyform", "castform"]);
    });

    it("does not shorten names that are names", () => {
        expect(acceptedNames("Iron Valiant ex")).toEqual(["ironvaliant"]);
        expect(acceptedNames("Tapu Koko")).toEqual(["tapukoko"]);
    });

    it("forgives one typo in a longer name", () => {
        const accepted = acceptedNames("Charizard ex");
        expect(isCorrectGuess("charizard", accepted)).toBe(true);
        expect(isCorrectGuess("CHARIZARD", accepted)).toBe(true);
        expect(isCorrectGuess("charizar", accepted)).toBe(true);
        expect(isCorrectGuess("charizardd", accepted)).toBe(true);
        expect(isCorrectGuess("charixard", accepted)).toBe(true);
        expect(isCorrectGuess("chairzard", accepted)).toBe(true);
    });

    it("rejects wrong names, and typos in short ones", () => {
        const accepted = acceptedNames("Charizard ex");
        expect(isCorrectGuess("charizzzrd", accepted)).toBe(false);
        expect(isCorrectGuess("blastoise", accepted)).toBe(false);
        expect(isCorrectGuess("", accepted)).toBe(false);
        expect(isCorrectGuess("!!!", accepted)).toBe(false);
        expect(isCorrectGuess("muk", acceptedNames("Mew"))).toBe(false);
        expect(isCorrectGuess("mex", acceptedNames("Mew"))).toBe(false);
    });
});

describe("Kto to Pokémon: the game", () => {
    const start = (difficulty: "easy" | "hard", seed = 1) => createWhoIsIt(catalog, difficulty, seededRng(seed));

    function play(state: WhoIsItState, correctAnswers: number) {
        let current = state;
        let outcome = "in_progress";
        for (let round = 0; round < WHO_IS_IT_ROUNDS; round++) {
            const clue = currentClue(current)!;
            const wrong = clue.options?.find((option) => option !== clue.name) ?? "zzzzzzzz";
            const result = answerWhoIsIt(current, round < correctAnswers ? clue.name : wrong);
            current = result.state;
            outcome = result.outcome;
        }
        return {state: current, outcome};
    }

    it("uses only Pokémon, each once", () => {
        const names = start("easy").rounds.map((round) => round.name);
        expect(names).toHaveLength(WHO_IS_IT_ROUNDS);
        expect(new Set(names).size).toBe(WHO_IS_IT_ROUNDS);
        expect(names).not.toContain("Iono");
        expect(names).not.toContain("Basic Fire Energy");
    });

    it("offers four different names including the right one", () => {
        for (const round of start("easy").rounds) {
            expect(new Set(round.options).size).toBe(4);
            expect(round.options).toContain(round.name);
        }
    });

    it("does not always put the right answer in the same place", () => {
        const places = start("easy").rounds.map((round) => round.options!.indexOf(round.name));
        expect(new Set(places).size).toBeGreaterThan(1);
    });

    it("asks to type the name at the hard level, showing a fragment", () => {
        for (const round of start("hard").rounds) {
            expect(round.options).toBeNull();
            expect(round.crop).not.toBeNull();
        }
    });

    it("is won with 3 of 5, and lost with 2 of 5", () => {
        expect(play(start("easy"), 3).outcome).toBe("won");
        expect(play(start("easy"), 5).outcome).toBe("won");
        expect(play(start("easy"), 2).outcome).toBe("lost");
        expect(play(start("hard"), 0).outcome).toBe("lost");
    });

    it("stays in progress until the last round", () => {
        const first = answerWhoIsIt(start("easy"), currentClue(start("easy"))!.name);
        expect(first.outcome).toBe("in_progress");
    });

    it("rejects an answer outside the options", () => {
        expect(() => answerWhoIsIt(start("easy"), "Anything")).toThrow(IllegalMinigameAction);
    });

    it("rejects an answer after the last round", () => {
        const {state} = play(start("easy"), 5);
        expect(() => answerWhoIsIt(state, "Alpha")).toThrow(IllegalMinigameAction);
    });

    it("does not reveal the current card to the client", () => {
        for (const difficulty of ["easy", "hard"] as const) {
            const state = start(difficulty);
            const view = JSON.stringify(viewWhoIsIt(state));
            const clue = currentClue(state)!;
            expect(view).not.toContain(clue.cardId);
            expect(view).not.toContain(clue.images.small);
            expect(view).not.toContain(clue.images.large);
            if (difficulty === "hard") expect(view).not.toContain(clue.name);
            expect(view).not.toContain("accepted");
        }
    });

    it("reveals only the round already played", () => {
        const state = start("easy");
        const clue = currentClue(state)!;
        const next = answerWhoIsIt(state, clue.name).state;
        const view = viewWhoIsIt(next);
        expect(view.last).toEqual({name: clue.name, image: clue.images.small, correct: true});
        expect(view.round).toBe(2);
        expect(JSON.stringify(view)).not.toContain(currentClue(next)!.images.small);
    });
});

describe("Memory", () => {
    const start = (difficulty: "easy" | "medium" | "hard" = "easy", seed = 1) =>
        createMemory(catalog, difficulty, seededRng(seed));

    function pairsOf(state: MemoryState) {
        const positions = new Map<number, number[]>();
        state.deck.forEach((card, position) => positions.set(card, [...(positions.get(card) ?? []), position]));
        return [...positions.values()];
    }

    function flipAll(state: MemoryState, cells: number[]) {
        let current = state;
        let outcome = "in_progress";
        for (const cell of cells) ({state: current, outcome} = flipMemory(current, cell));
        return {state: current, outcome};
    }

    it("deals the agreed number of pairs", () => {
        for (const difficulty of ["easy", "medium", "hard"] as const) {
            const state = start(difficulty);
            expect(state.cards).toHaveLength(MEMORY_PAIRS[difficulty]);
            expect(state.deck).toHaveLength(MEMORY_PAIRS[difficulty] * 2);
            for (const positions of pairsOf(state)) expect(positions).toHaveLength(2);
        }
        expect(MEMORY_PAIRS).toEqual({easy: 6, medium: 8, hard: 12});
    });

    it("is won by finding every pair", () => {
        const state = start();
        const {outcome, state: end} = flipAll(state, pairsOf(state).flat());
        expect(outcome).toBe("won");
        expect(end.mistakes).toBe(0);
    });

    it("counts a mismatch as one mistake and turns the cards back on the next flip", () => {
        const state = start();
        const [a, b] = pairsOf(state);
        const shown = flipAll(state, [a[0], b[0]]).state;
        expect(shown.mistakes).toBe(1);
        expect(viewMemory(shown).mismatch).toBe(true);
        expect(viewMemory(shown).positions.filter((p) => p.status === "open")).toHaveLength(2);

        const next = flipMemory(shown, a[1]).state;
        expect(next.open).toEqual([a[1]]);
        expect(viewMemory(next).positions.filter((p) => p.status === "open")).toHaveLength(1);
    });

    it("cannot be lost at the easy and medium levels", () => {
        let state = start("medium");
        const [a, b] = pairsOf(state);
        for (let i = 0; i < MEMORY_MISTAKE_LIMIT * 2; i++) {
            const result = flipAll(state, [a[0], b[0]]);
            expect(result.outcome).toBe("in_progress");
            state = result.state;
        }
    });

    it("is lost at the hard level on reaching the limit of mistakes", () => {
        let state = start("hard");
        const [a, b] = pairsOf(state);
        let outcome = "in_progress";
        for (let i = 0; i < MEMORY_MISTAKE_LIMIT; i++) {
            expect(outcome).toBe("in_progress");
            ({state, outcome} = flipAll(state, [a[0], b[0]]));
        }
        expect(outcome).toBe("lost");
        expect(state.mistakes).toBe(MEMORY_MISTAKE_LIMIT);
    });

    it("rejects flipping an open card, a found pair and a position off the table", () => {
        const state = start();
        const [a] = pairsOf(state);
        expect(() => flipAll(state, [a[0], a[0]])).toThrow(IllegalMinigameAction);
        const found = flipAll(state, a).state;
        expect(() => flipMemory(found, a[0])).toThrow(IllegalMinigameAction);
        expect(() => flipMemory(state, -1)).toThrow(IllegalMinigameAction);
        expect(() => flipMemory(state, state.deck.length)).toThrow(IllegalMinigameAction);
        expect(() => flipMemory(state, 0.5)).toThrow(IllegalMinigameAction);
    });

    it("shows the client nothing about cards not turned", () => {
        const state = start();
        const view = JSON.stringify(viewMemory(state));
        for (const card of state.cards) {
            expect(view).not.toContain(card.name);
            expect(view).not.toContain(card.image);
        }
        expect(view).not.toContain("deck");
    });

    it("reveals one card per flip, and only that card", () => {
        const state = start();
        const view = viewMemory(flipMemory(state, 0).state);
        expect(view.positions.filter((position) => position.status !== "hidden")).toHaveLength(1);
        expect(view.positions[0]).toMatchObject({status: "open", name: state.cards[state.deck[0]].name});
    });
});

describe("sliding puzzle", () => {
    const start = (difficulty: "easy" | "medium" | "hard" = "easy", seed = 1) =>
        createPuzzle(catalog, difficulty, seededRng(seed));

    /** Every 3×3 board reachable from the solved one, with the cell to tap for one step back towards it. */
    function stepsTowardsSolved(): Map<number, number> {
        const key = (board: readonly number[]) => board.reduce((sum, tile) => sum * 9 + tile, 0);
        const steps = new Map<number, number>([[key(solvedTiles(3)), -1]]);
        const queue = [solvedTiles(3)];
        for (let head = 0; head < queue.length; head++) {
            const board = queue[head];
            const gap = board.indexOf(0);
            for (const cell of neighbours(gap, 3)) {
                const next = slideTile(board, 3, cell)!;
                if (steps.has(key(next))) continue;
                // Tapping the cell where the gap was undoes this move.
                steps.set(key(next), gap);
                queue.push(next);
            }
        }
        return steps;
    }

    function solve3x3(tiles: number[], steps: Map<number, number>): number[] {
        const key = (board: readonly number[]) => board.reduce((sum, tile) => sum * 9 + tile, 0);
        const cells: number[] = [];
        let board = tiles;
        while (!isSolved(board)) {
            const cell = steps.get(key(board));
            if (cell === undefined) throw new Error("Unsolvable board");
            cells.push(cell);
            board = slideTile(board, 3, cell)!;
        }
        return cells;
    }

    it("has the agreed sizes", () => {
        expect(PUZZLE_SIZES).toEqual({easy: 3, medium: 4, hard: 5});
        for (const difficulty of ["easy", "medium", "hard"] as const) {
            const {size, tiles} = start(difficulty);
            expect(tiles).toHaveLength(size * size);
            expect([...tiles].sort((a, b) => a - b)).toEqual(Array.from({length: size * size}, (_, i) => i));
        }
    });

    it("never starts solved", () => {
        for (let seed = 1; seed <= 100; seed++) expect(isSolved(shuffleTiles(3, seededRng(seed)))).toBe(false);
    });

    it("can always be solved", () => {
        const steps = stepsTowardsSolved();
        // Half of all arrangements cannot be reached from the solved board, so this is a real check.
        expect(steps.size).toBe(181_440);
        for (let seed = 1; seed <= 200; seed++) {
            const state = start("easy", seed);
            const {outcome, state: end} = movePuzzle(state, solve3x3(state.tiles, steps));
            expect(outcome).toBe("won");
            expect(isSolved(end.tiles)).toBe(true);
        }
    });

    it("counts moves, and keeps playing until solved", () => {
        const state: PuzzleState = {...start(), tiles: [1, 2, 3, 4, 5, 6, 0, 7, 8], moves: 0};
        const first = movePuzzle(state, [7]);
        expect(first.outcome).toBe("in_progress");
        expect(first.state.moves).toBe(1);
        const second = movePuzzle(first.state, [8]);
        expect(second.outcome).toBe("won");
        expect(second.state.moves).toBe(2);
    });

    it("rejects a tile that is not next to the gap", () => {
        const state: PuzzleState = {...start(), tiles: [1, 2, 3, 4, 5, 6, 7, 8, 0]};
        expect(() => movePuzzle(state, [0])).toThrow(IllegalMinigameAction);
        expect(() => movePuzzle(state, [8])).toThrow(IllegalMinigameAction);
    });

    it("does not treat row ends as neighbours", () => {
        // The gap ends a row; the next cell starts another one.
        const state: PuzzleState = {...start(), tiles: [1, 2, 0, 3, 4, 5, 6, 7, 8]};
        expect(() => movePuzzle(state, [3])).toThrow(IllegalMinigameAction);
    });

    it("rejects a whole batch with one illegal move, keeping the state", () => {
        const state: PuzzleState = {...start(), tiles: [1, 2, 3, 4, 5, 6, 0, 7, 8], moves: 3};
        const copy = JSON.stringify(state);
        expect(() => movePuzzle(state, [7, 0])).toThrow(IllegalMinigameAction);
        expect(JSON.stringify(state)).toBe(copy);
    });

    it("rejects moves after the solution within one batch", () => {
        const state: PuzzleState = {...start(), tiles: [1, 2, 3, 4, 5, 6, 7, 0, 8]};
        expect(() => movePuzzle(state, [8, 7])).toThrow(IllegalMinigameAction);
    });

    it("prefers full-art cards for the picture", () => {
        for (let seed = 1; seed <= 20; seed++) {
            const index = Number(/\/(\d+)_hires/.exec(start("easy", seed).image)?.[1]);
            expect(index % 2).toBe(0);
        }
    });
});

describe("the common interface", () => {
    it("creates, plays and describes every variant", () => {
        for (const variant of MINIGAME_VARIANTS) {
            const state = createMinigame(variant, catalog, seededRng(3));
            expect(state.game).toBe(variant.game);
            expect(state.difficulty).toBe(variant.difficulty);
            expect(viewOf(state).game).toBe(variant.game);
        }
    });

    it("rejects an action meant for another game", () => {
        const memory = createMinigame({game: "memory", difficulty: "easy"}, catalog, seededRng(3));
        expect(() => applyAction(memory, {type: "answer", answer: "Alpha"})).toThrow(IllegalMinigameAction);
        expect(() => applyAction(memory, {type: "moves", cells: [0]})).toThrow(IllegalMinigameAction);
        const puzzle = createMinigame({game: "sliding_puzzle", difficulty: "easy"}, catalog, seededRng(3));
        expect(() => applyAction(puzzle, {type: "flip", position: 0})).toThrow(IllegalMinigameAction);
    });
});
