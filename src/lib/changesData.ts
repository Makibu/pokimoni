type Change = {
    type: "Added" | "Fixed" | "Design";
    title: string;
    options: string[];
}[];

export const changesData: Change = [
    {
        type: "Added",
        title: "✨ Nowe funkcje",
        options: ["Dodano pole 'wszystkie karty' w statystykach", "Nowa gra 'Saper' !!! 💥💥💥"],
    },
    {
        type: "Fixed",
        title: "🔧 Poprawki",
        options: [
            "Zmienione szanse na trudności sudoku, większe szanse na medium i hard",
            "Teraz w sklepie wyświetla się unikatowa ilość kart w postępie",
            "Postęp osiągnięć jest teraz liczony poprawnie w statystykach",
        ],
    },
    {
        type: "Design",
        title: "🎨 Design",
        options: ["Loga paczek już nie nachodzą na napisy"],
    },
];

export const changeDate: string = "10 października 2025";
export const version: string = "v1.0.2";
