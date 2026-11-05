import type {MinigameDifficulty} from "@/domain/economy";
import type {Minigame} from "@/domain/minigames";
import {MEMORY_MISTAKE_LIMIT, MEMORY_PAIRS} from "@/domain/minigames/memory";
import {WHO_IS_IT_ROUNDS, WHO_IS_IT_TO_WIN} from "@/domain/minigames/who-is-it";

export const GAME_NAMES: Record<Minigame, string> = {
    who_is_it: "Kto to Pokémon?",
    memory: "Memory",
    sliding_puzzle: "Puzzle przesuwne",
};

export const DIFFICULTY_NAMES: Record<MinigameDifficulty, string> = {
    easy: "łatwy",
    medium: "średni",
    hard: "trudny",
};

const WHO_IS_IT_GOAL = `Do wygranej potrzeba ${WHO_IS_IT_TO_WIN} dobrych odpowiedzi z ${WHO_IS_IT_ROUNDS}.`;
const WHO_IS_IT_RULES: Record<MinigameDifficulty, string> = {
    easy: `Rozpoznaj Pokémona po rozmytym obrazku i wybierz jedną z czterech nazw. ${WHO_IS_IT_GOAL}`,
    medium: `Rozpoznaj Pokémona po ciemnym cieniu obrazka i wybierz jedną z czterech nazw. ${WHO_IS_IT_GOAL}`,
    hard: `Rozpoznaj Pokémona po małym fragmencie obrazka i wpisz jego nazwę po angielsku, jak na karcie. Jedna literówka nie przeszkadza. ${WHO_IS_IT_GOAL}`,
};

const PUZZLE_RULES: Record<MinigameDifficulty, string> = {
    easy: "Ułóż kartę z 9 kafelków, przesuwając je na wolne pole.",
    medium: "Ułóż kartę z 16 kafelków, przesuwając je na wolne pole.",
    hard: "Ułóż kartę z 25 kafelków, przesuwając je na wolne pole.",
};

export function gameRules(game: Minigame, difficulty: MinigameDifficulty): string {
    if (game === "who_is_it") return WHO_IS_IT_RULES[difficulty];
    if (game === "sliding_puzzle") return PUZZLE_RULES[difficulty];
    const pairs = `Znajdź ${MEMORY_PAIRS[difficulty]} par kart.`;
    return difficulty === "hard" ? `${pairs} Gra kończy się po ${MEMORY_MISTAKE_LIMIT} pomyłkach.` : pairs;
}
