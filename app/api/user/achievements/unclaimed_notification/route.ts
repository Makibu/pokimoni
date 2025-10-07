import {supabaseServer} from "@/lib/supabaseServer";
import {NextResponse} from "next/server";

export async function GET(req: Request) {
    const {searchParams} = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
        return NextResponse.json({error: "Brak uid w zapytaniu"}, {status: 400});
    }

    const {data, error} = await supabaseServer
        .from("user_unclaimed_achievements_flag")
        .select("*")
        .eq("uid", uid)
        .maybeSingle();

    if (error) return NextResponse.json({error: error.message}, {status: 500});

    return NextResponse.json(data);
}