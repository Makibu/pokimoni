import type {MinigameDifficulty} from "../economy";
import type {Rng} from "../packs";
import {type CatalogCard, IllegalMinigameAction, type Outcome, pickDistinct, shuffled} from "./common";

export const WHO_IS_IT_ROUNDS = 5;
export const WHO_IS_IT_TO_WIN = 3;
const OPTIONS_PER_ROUND = 4;
/** Lets a single typo through in longer names, because there is no second chance at a round. */
const TYPO_TOLERANT_LENGTH = 5;

const POKEMON_SUBTYPES = ["Basic", "Stage 1", "Stage 2"];

export function isPokemonCard(card: {name: string; subtypes: string[] | null}): boolean {
    return (
        (card.subtypes ?? []).some((subtype) => POKEMON_SUBTYPES.includes(subtype)) && !card.name.endsWith(" Energy")
    );
}

/** The Pokémon on a card: "Team Rocket's Nidoking ex" is Nidoking. */
export function pokemonName(cardName: string): string {
    return cardName.replace(/ (ex|EX|V|VMAX|VSTAR|GX)$/, "").replace(/^.*'s /, "");
}

const FORM_PREFIX =
    /^(Alolan|Galarian|Hisuian|Paldean|Bloodmoon|Black|White|Heat|Wash|Mow|Fan|Frost|(Teal|Wellspring|Hearthflame|Cornerstone) Mask) /;
const FORM_SUFFIX = / \w+ Form$/;

export function normalizeName(name: string): string {
    return name
        .normalize("NFD")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

/** Names that count as a correct typed answer: the full one, and the species without its regional form. */
export function acceptedNames(cardName: string): string[] {
    const name = pokemonName(cardName);
    const species = name.replace(FORM_PREFIX, "").replace(FORM_SUFFIX, "");
    return [...new Set([normalizeName(name), normalizeName(species)])];
}

function isWithinOneEdit(a: string, b: string): boolean {
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    const restA = a.slice(i);
    const restB = b.slice(i);
    return (
        restA.slice(1) === restB.slice(1) ||
        restA === restB.slice(1) ||
        restA.slice(1) === restB ||
        (restA.length > 1 && restA[0] === restB[1] && restA[1] === restB[0] && restA.slice(2) === restB.slice(2))
    );
}

export function isCorrectGuess(guess: string, accepted: readonly string[]): boolean {
    const normalized = normalizeName(guess);
    if (normalized === "") return false;
    return accepted.some(
        (name) =>
            name === normalized ||
            (name.length >= TYPO_TOLERANT_LENGTH &&
                normalized.length >= TYPO_TOLERANT_LENGTH &&
                isWithinOneEdit(normalized, name)),
    );
}

export type WhoIsItRound = {
    cardId: string;
    name: string;
    accepted: string[];
    /** Null when the name has to be typed. */
    options: string[] | null;
    images: CatalogCard["images"];
    /** Corner of the shown fragment, as a fraction of the card's art. Hard level only. */
    crop: {x: number; y: number} | null;
};

export type WhoIsItState = {
    game: "who_is_it";
    difficulty: MinigameDifficulty;
    rounds: WhoIsItRound[];
    results: boolean[];
};

export type WhoIsItView = {
    game: "who_is_it";
    difficulty: MinigameDifficulty;
    round: number;
    total: number;
    correct: number;
    toWin: number;
    options: string[] | null;
    last: {name: string; image: string; correct: boolean} | null;
};

export function createWhoIsIt(catalog: readonly CatalogCard[], difficulty: MinigameDifficulty, rng: Rng): WhoIsItState {
    const pokemon = catalog.filter(isPokemonCard);
    const speciesKey = (card: CatalogCard) => normalizeName(pokemonName(card.name));
    const picked = pickDistinct(pokemon, WHO_IS_IT_ROUNDS, speciesKey, rng);

    const rounds = picked.map((card): WhoIsItRound => {
        const name = pokemonName(card.name);
        const others = pokemon.filter((other) => speciesKey(other) !== speciesKey(card));
        const options =
            difficulty === "hard"
                ? null
                : shuffled(
                      [
                          name,
                          ...pickDistinct(others, OPTIONS_PER_ROUND - 1, speciesKey, rng).map((other) =>
                              pokemonName(other.name),
                          ),
                      ],
                      rng,
                  );
        return {
            cardId: card.id,
            name,
            accepted: acceptedNames(card.name),
            options,
            images: card.images,
            crop: difficulty === "hard" ? {x: 0.2 + rng() * 0.26, y: 0.02 + rng() * 0.4} : null,
        };
    });

    return {game: "who_is_it", difficulty, rounds, results: []};
}

export function answerWhoIsIt(state: WhoIsItState, answer: string): {state: WhoIsItState; outcome: Outcome} {
    const round = state.rounds[state.results.length];
    if (!round) throw new IllegalMinigameAction("All rounds have been played");
    if (round.options && !round.options.includes(answer)) throw new IllegalMinigameAction("Not one of the options");

    const correct = round.options ? answer === round.name : isCorrectGuess(answer, round.accepted);
    const results = [...state.results, correct];
    const score = results.filter(Boolean).length;
    const outcome: Outcome =
        results.length < state.rounds.length ? "in_progress" : score >= WHO_IS_IT_TO_WIN ? "won" : "lost";
    return {state: {...state, results}, outcome};
}

/** What the client may know: the current round's options, and only the answer to the round already played. */
export function viewWhoIsIt(state: WhoIsItState): WhoIsItView {
    const played = state.results.length;
    const previous = played > 0 ? state.rounds[played - 1] : null;
    return {
        game: "who_is_it",
        difficulty: state.difficulty,
        round: played + 1,
        total: state.rounds.length,
        correct: state.results.filter(Boolean).length,
        toWin: WHO_IS_IT_TO_WIN,
        options: state.rounds[played]?.options ?? null,
        last: previous ? {name: previous.name, image: previous.images.small, correct: state.results[played - 1]} : null,
    };
}

/** The round whose picture is being guessed, for rendering on the server. */
export function currentClue(state: WhoIsItState): WhoIsItRound | null {
    return state.rounds[state.results.length] ?? null;
}
