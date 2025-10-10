import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";

export async function GET(req: Request) {
    const {searchParams} = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
        return NextResponse.json({error: "Brak uid w zapytaniu"}, {status: 400});
    }

    const {data, error} = await supabaseServer
        .from("user_stats")
        .select("sudoku_flag, minesweeper_flag")
        .eq("uid", uid)
        .single();

    if (error) return NextResponse.json({error: error.message}, {status: 500});

    return NextResponse.json({
        sudoku_flag: data.sudoku_flag ?? false,
        minesweeper_flag: data.minesweeper_flag ?? false,
    });
}

export async function POST(req: Request) {
    const body = await req.json();
    const {uid, gameName} = body;

    if (!uid || !gameName) {
        return NextResponse.json(
            {error: "Brak uid lub gameName w body"},
            {status: 400}
        );
    }

    const validColumns = ["sudoku_flag", "minesweeper_flag"];

    if (!validColumns.includes(gameName)) {
        return NextResponse.json({error: "Niepoprawna nazwa gry"}, {status: 400});
    }

    const updateObj: Record<string, boolean> = {};
    updateObj[gameName] = true;

    const {error} = await supabaseServer
        .from("user_stats")
        .update(updateObj)
        .eq("uid", uid);

    if (error) return NextResponse.json({error: error.message}, {status: 500});

    return NextResponse.json({success: true});
}
