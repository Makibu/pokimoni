import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";

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

    const response = await fetch("https://sudoku-api.vercel.app/api/dosuku");
    const json = await response.json();
    const grid = json.newboard.grids[0];

    const {data: inserted, error: insertError} = await supabaseServer
        .from("daily_sudoku")
        .insert([
            {
                board: grid.value,
                solution: grid.solution,
                difficulty: grid.difficulty,
            },
        ])
        .select()
        .single();

    if (insertError) {
        return NextResponse.json({error: insertError.message}, {status: 500});
    }

    return NextResponse.json({sudoku: inserted});
}
