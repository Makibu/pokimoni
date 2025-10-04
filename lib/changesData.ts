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
            "Dodano codzienną paczkę",
            "Dodano śledzenie postępu na stronie sklepu",
            "Dodano avatary!"
        ]
    },
    {
        type: "Fixed",
        title: "🔧 Poprawki",
        options: [
            "Osiągnięcia działają bez odświeżenia",
            "Strona /index to teraz /collection",
            "Strona index/collection już działa"
        ]
    },
    {
        type: "Design",
        title: "🎨 Design",
        options: [
            ""
        ]
    }
]

export const changeDate: string = "4 października 2025"
export const version: string = "v1.0.0-beta"