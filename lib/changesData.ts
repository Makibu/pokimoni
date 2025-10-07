type Change = {
    type: "Added" | "Fixed" | "Design",
    title: string,
    options: string[]
}[]

export const changesData: Change = [
    {
        type: "Added",
        title: "✨ Nowe funkcje",
        options: [
            "Powiadomienie o nieodebranych nagrodach za osiągnięcia",
            "Formularz do zgłaszania błędów/pomysłów w prawym dolnym rogu ekranu na stronie głównej",
            "34 osiągnięcia"
        ]
    },
    {
        type: "Fixed",
        title: "🔧 Poprawki",
        options: [
            "Rebalans zniżek codziennych paczek, z 50% na (25->75->100) monet w zależności od ceny początkowej",
            "Rebalans szans we wszystkich paczkach",
            "Sudoku od teraz ma tylko jedno rozwiązanie, oraz poziomy trudności znacząco uległy zmianie",
            "Tymczasowo wyłączona opcja włączenia trybu ciemnego w ustawieniach"
        ]
    },
    {
        type: "Design",
        title: "🎨 Design",
        options: [
            "Zmienione ułożenie strony głównej na mniejsze urządzenia",
            "Dodany pasek na dole ekranu do prostej nawigacji",
            "Usunięte rozwijane 'burger menu' z górnego paska nawigacji",
            "Zwiększony kontrast ukończonych osiągnięć oraz tych nieodebranych"
        ]
    }
]

export const changeDate: string = "7 października 2025"
export const version: string = "v1.0.0"