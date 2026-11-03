import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";

function stringToBoard(str: string): number[][] {
    const numbers = str.split("").map((ch) => parseInt(ch, 10));
    const board: number[][] = [];
    for (let i = 0; i < 9; i++) {
        board.push(numbers.slice(i * 9, (i + 1) * 9));
    }
    return board;
}

export async function GET() {
    const {data, error} = await supabaseServer.from("daily_sudoku").select("*").single();

    if (error && error.code !== "PGRST116") {
        return NextResponse.json({error: error.message}, {status: 500});
    }

    if (data) {
        return NextResponse.json({sudoku: data});
    }

    const difficulties = ["easy", "medium", "medium"];
    const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];

    const url = "https://youdosudoku.com/api/";

    const response = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({difficulty: randomDifficulty}),
    });

    if (!response.ok) {
        return NextResponse.json({error: `Sudoku API error: ${response.statusText}`}, {status: response.status});
    }

    const json = await response.json();

    const {puzzle, solution, difficulty} = json;

    const puzzleBoard = stringToBoard(puzzle);
    const solutionBoard = stringToBoard(solution);

    const {data: inserted, error: insertError} = await supabaseServer
        .from("daily_sudoku")
        .insert([
            {
                board: puzzleBoard,
                solution: solutionBoard,
                difficulty: difficulty || randomDifficulty,
            },
        ])
        .select()
        .single();

    if (insertError) {
        return NextResponse.json({error: insertError.message}, {status: 500});
    }

    return NextResponse.json({sudoku: inserted});
}
