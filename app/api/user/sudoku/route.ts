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
        .select("sudoku_flag")
        .eq("uid", uid)
        .single()

    if (error) return NextResponse.json({error: error.message}, {status: 500});

    console.log(data)

    return NextResponse.json({data})
}

export async function POST(req: Request) {
    const body = await req.json();
    const {uid} = body;

    if (!uid) {
        return NextResponse.json({error: "Brak uid w body"}, {status: 400});
    }

    const {error} = await supabaseServer
        .from("user_stats")
        .update({sudoku_flag: true})
        .eq("uid", uid);

    if (error) return NextResponse.json({error: error.message}, {status: 500});

    return NextResponse.json({success: true});
}