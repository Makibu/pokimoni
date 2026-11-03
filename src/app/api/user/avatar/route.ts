import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";

export async function GET(req: Request) {
    const {searchParams} = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
        return NextResponse.json({error: "Brak uid"}, {status: 400});
    }

    const {data, error} = await supabaseServer
        .from("users")
        .select("avatar")
        .eq("uid", uid)
        .single();

    if (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }

    return NextResponse.json({avatar: data.avatar});
}