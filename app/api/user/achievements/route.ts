import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";

export async function GET(req: Request) {
    const {searchParams} = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
        return NextResponse.json({error: "Brak uid w zapytaniu"}, {status: 400});
    }

    const {data, error} = await supabaseServer
        .from("user_achievements")
        .select(`
                achievement_id,
                unlocked_at
              `)
        .eq("uid", uid);

    if (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }

    return NextResponse.json({userAchievements: data});
}

export async function POST(req: Request) {
    const body = await req.json();
    const {uid, achievements} = body;

    if (!uid || !Array.isArray(achievements) || achievements.length === 0) {
        return NextResponse.json({error: "Brak uid lub achievements[] w body"}, {status: 400});
    }

    const {data: existing, error: existError} = await supabaseServer
        .from("user_achievements")
        .select("achievement_id")
        .eq("uid", uid);

    if (existError) {
        return NextResponse.json({error: existError.message}, {status: 500});
    }

    const existingIds = (existing || []).map((e) => e.achievement_id);

    const newAchievements = achievements
        .filter((id: number) => !existingIds.includes(id))
        .map((id: number) => ({uid, achievement_id: id}));

    if (newAchievements.length === 0) {
        return NextResponse.json({message: "Brak nowych achievementów do odblokowania"});
    }

    const {data, error} = await supabaseServer
        .from("user_achievements")
        .insert(newAchievements)
        .select();

    if (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }

    return NextResponse.json({
        message: "Nowe achievementy odblokowane",
        achievements: data,
    });
}

