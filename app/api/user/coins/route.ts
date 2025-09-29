import {NextRequest, NextResponse} from "next/server";
import {supabaseServer} from '@/lib/supabaseServer';


export async function GET(req: NextRequest) {
    const {searchParams} = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
        return NextResponse.json({error: "Brak uid w zapytaniu"}, {status: 400});
    }

    const {data, error} = await supabaseServer
        .from("user_stats")
        .select("coins, daily_coins_flag")
        .eq("uid", uid)
        .single();

    if (error) return NextResponse.json({error: error.message}, {status: 500});

    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const {uid, type, amount} = body as {
        uid: string;
        type: "daily" | "minigame" | "purchase" | "achievement";
        amount: number;
    };

    if (!uid || !type) {
        return NextResponse.json({error: "Missing parameters"}, {status: 400});
    }

    const {data: userStat, error: fetchError} = await supabaseServer
        .from("user_stats")
        .select("coins, daily_coins_flag")
        .eq("uid", uid)
        .maybeSingle();

    if (fetchError) return NextResponse.json({error: fetchError.message}, {status: 500});

    if (type === "daily" && !userStat?.daily_coins_flag) {
        return NextResponse.json({error: "Daily coins already collected"}, {status: 400});
    }

    const updates: { coins: number; daily_coins_flag?: boolean } = {coins: userStat?.coins + amount};

    if (type === "daily") {
        updates.daily_coins_flag = false;
    }

    const {data: updated, error: updateError} = await supabaseServer
        .from("user_stats")
        .update(updates)
        .eq("uid", uid)
        .select("coins, daily_coins_flag")
        .single();

    if (updateError) return NextResponse.json({error: updateError.message}, {status: 500});

    return NextResponse.json(updated);
}
