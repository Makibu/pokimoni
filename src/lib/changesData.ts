type Change = {
    type: "Added" | "Fixed" | "Design";
    title: string;
    options: string[];
}[];

export const changesData: Change = [
    {
        type: "Design",
        title: "🎨 Design",
        options: [
            "Nowy wygląd całej gry: Holo",
            "Nowe otwieranie paczek: rozcinanie i odkrywanie kart po kolei",
            "Działa na telefonie, tablecie i komputerze",
        ],
    },
    {
        type: "Added",
        title: "✨ Nowe funkcje",
        options: [
            "Znajomi, skrzynka powiadomień i profile graczy z gablotą kart",
            "Wymiany kart między znajomymi",
            "Zadania dzienne i minigra dnia: Kto to Pokémon?, Memory i Puzzle",
            "Seria nagród dziennych i skarbonka na dochód z kart",
            "Motyw jasny, ciemny lub systemowy (Ustawienia)",
        ],
    },
    {
        type: "Fixed",
        title: "🔧 Poprawki",
        options: [
            "Bezpieczniejsze konta: monety, karty i wyniki gier liczy teraz serwer",
            "Strony ładują się szybciej i pokazują podgląd w trakcie ładowania",
            "Nazwy kart są widoczne także na ekranach dotykowych",
        ],
    },
];

export const changeDate: string = "5 listopada 2026";
export const version: string = "v2.1.0";
