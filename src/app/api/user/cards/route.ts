import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";

export async function GET(req: Request) {
    const {searchParams} = new URL(req.url);
    const uid = searchParams.get("uid");
    const setId = searchParams.get("setId");

    if (!uid) {
        return NextResponse.json({error: "Brak uid w zapytaniu"}, {status: 400});
    }

    let query = supabaseServer
        .from("user_cards")
        .select(
            `
                id,
                card_id,
                quantity,
                acquired_at,
                cards (*)
              `,
        )
        .eq("uid", uid);

    if (setId) {
        query = query.eq("cards.set_id", setId);
    }

    const {data, error} = await query;

    if (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }

    return NextResponse.json({userCards: data});
}

export async function POST(req: Request) {
    const body = await req.json();
    const {uid, cards, set_id} = body;

    if (!uid || !cards || !Array.isArray(cards) || !set_id) {
        return NextResponse.json({error: "Invalid payload"}, {status: 400});
    }

    let totalCardsAdded = 0;
    let uniqueCardsAdded = 0;

    for (const {card_id, quantity} of cards) {
        const {data: existing, error: selectError} = await supabaseServer
            .from("user_cards")
            .select("id, quantity")
            .eq("uid", uid)
            .eq("card_id", card_id)
            .maybeSingle();

        if (selectError) throw new Error(selectError.message);

        totalCardsAdded += quantity;

        if (existing) {
            const {error: updateError} = await supabaseServer
                .from("user_cards")
                .update({quantity: existing.quantity + quantity})
                .eq("id", existing.id);

            if (updateError) throw new Error(updateError.message);
        } else {
            uniqueCardsAdded += 1;
            const {error: insertError} = await supabaseServer.from("user_cards").insert({uid, card_id, quantity});

            if (insertError) throw new Error(insertError.message);
        }
    }

    const {data: statsData, error: statsError} = await supabaseServer
        .from("user_stats")
        .select("*")
        .eq("uid", uid)
        .single();

    if (statsError) throw new Error(statsError.message);

    const {error: updateStatsError} = await supabaseServer
        .from("user_stats")
        .update({
            total_cards: (statsData.total_cards ?? 0) + totalCardsAdded,
            total_unique_cards: (statsData.total_unique_cards ?? 0) + uniqueCardsAdded,
            total_packs: (statsData.total_packs ?? 0) + 1,
        })
        .eq("uid", uid);

    if (updateStatsError) throw new Error(updateStatsError.message);

    const {error: packError} = await supabaseServer.from("user_packs").insert({
        uid,
        set_id,
        opened_at: new Date().toISOString(),
    });

    if (packError) throw new Error(packError.message);

    const {data: newStats, error: newStatsError} = await supabaseServer
        .from("user_stats")
        .select("*")
        .eq("uid", uid)
        .single();

    if (newStatsError) throw new Error(newStatsError.message);

    return NextResponse.json({
        success: true,
        totalCardsAdded,
        uniqueCardsAdded,
        userStats: newStats,
    });
}
