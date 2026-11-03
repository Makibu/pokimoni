import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";

export async function GET(req: Request) {
    const {searchParams} = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
        return NextResponse.json({error: "Brak uid w zapytaniu"}, {status: 400});
    }

    const {data, error} = await supabaseServer.from("user_badges").select("badge_id").eq("user_id", uid);

    if (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }

    return NextResponse.json({userBadges: data});
}

export async function POST(req: Request) {
    const body = await req.json();
    const {uid, badges}: {uid: string; badges: string[]} = body;

    if (!uid || !badges?.length) {
        return NextResponse.json({error: "Brak uid lub badges w body"}, {status: 400});
    }

    const {data, error} = await supabaseServer.from("user_badges").insert(
        badges.map((badgeId) => ({
            user_id: uid,
            badge_id: badgeId,
            acquired_at: new Date().toISOString(),
        })),
    );

    if (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }

    return NextResponse.json({addedBadges: data});
}
