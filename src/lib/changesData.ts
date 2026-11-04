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
            "Nowe logowanie, start, sklep, kolekcja, osiągnięcia i statystyki",
            "Działa na telefonie, tablecie i komputerze",
        ],
    },
    {
        type: "Added",
        title: "✨ Nowe funkcje",
        options: [
            "Motyw jasny, ciemny lub systemowy (Ustawienia)",
            "Nagroda dzienna i paczka dnia są też na stronie startowej",
            "Kartę można zdjąć ze slotu osobnym przyciskiem",
        ],
    },
    {
        type: "Fixed",
        title: "🔧 Poprawki",
        options: [
            "Strony ładują się szybciej i pokazują podgląd w trakcie ładowania",
            "Nazwy kart są widoczne także na ekranach dotykowych",
            "Pasek boczny nie zasłania już statystyk",
        ],
    },
];

export const changeDate: string = "4 listopada 2026";
export const version: string = "v2.0.0";
