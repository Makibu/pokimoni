import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";

function replaceNullsWithZero(board: (number | null)[][]): number[][] {
    return board.map(row => row.map(cell => cell === null ? 0 : cell));
}

export async function GET() {
    const {data, error} = await supabaseServer
        .from("daily_sudoku")
        .select("*")
        .single();

    if (error && error.code !== "PGRST116") {
        return NextResponse.json({error: error.message}, {status: 500});
    }

    if (data) {
        return NextResponse.json({sudoku: data});
    }

    const difficulties = ["easy", "medium", "medium", "medium", "hard", "hard"];
    const randomDifficulty =
        difficulties[Math.floor(Math.random() * difficulties.length)];

    const apiKey = process.env.API_NINJAS_KEY;

    if (!apiKey) {
        return NextResponse.json(
            {error: "Missing API_NINJAS_KEY environment variable"},
            {status: 500}
        );
    }

    const url = `https://api.api-ninjas.com/v1/sudokugenerate?width=3&height=3&difficulty=${randomDifficulty}`;

    const response = await fetch(url, {
        headers: {
            "X-Api-Key": apiKey,
        },
    });

    if (!response.ok) {
        return NextResponse.json(
            {error: `Sudoku API error: ${response.statusText}`},
            {status: response.status}
        );
    }

    const json = await response.json();

    const {puzzle, solution} = json;

    const cleanedPuzzle = replaceNullsWithZero(puzzle);
    const cleanedSolution = replaceNullsWithZero(solution);

    const {data: inserted, error: insertError} = await supabaseServer
        .from("daily_sudoku")
        .insert([
            {
                board: cleanedPuzzle,
                solution: cleanedSolution,
                difficulty: randomDifficulty,
            },
        ])
        .select()
        .single();

    if (insertError) {
        return NextResponse.json({error: insertError.message}, {status: 500});
    }

    return NextResponse.json({sudoku: inserted});
}
