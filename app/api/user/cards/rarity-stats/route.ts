import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";
import {PostgrestError} from "@supabase/supabase-js";

interface CardWithRarity {
    rarity: string | null;
}

interface UserCardWithRarity {
    quantity: number;
    cards: CardWithRarity | null;
}

const rarityOrder: Record<string, number> = {
    "common": 1,
    "uncommon": 2,
    "rare": 3,
    "double rare": 4,
    "ultra rare": 5,
    "ace spec rare": 6,
    "illustration rare": 7,
    "special illustration rare": 8,
    "hyper rare": 9,
    "secret rare": 10,
};

export async function GET(req: Request) {
    try {
        const {searchParams} = new URL(req.url);
        const uid = searchParams.get("uid");

        if (!uid) {
            return NextResponse.json({error: "Brak uid w zapytaniu"}, {status: 400});
        }

        const rarityStats: Record<string, number> = {};
        for (const rarity of Object.keys(rarityOrder)) {
            rarityStats[rarity.toLowerCase()] = 0;
        }

        const {data: userCards, error: userCardsError} = await supabaseServer
            .from("user_cards")
            .select(`
        quantity,
        cards:card_id(rarity)
      `)
            .eq("uid", uid) as { data: UserCardWithRarity[] | null; error: PostgrestError | null };

        if (userCardsError) {
            return NextResponse.json({error: userCardsError.message}, {status: 500});
        }

        userCards?.forEach(c => {
            const card = c.cards;
            const rarity = (card?.rarity ?? "unknown").toLowerCase();

            if (rarity in rarityStats) {
                rarityStats[rarity] += c.quantity ?? 0;
            } else {
                rarityStats[rarity] = c.quantity ?? 0;
            }
        });

        const rarityList = Object.keys(rarityOrder).map(r => ({
            rarity: r.toLowerCase(),
            count: rarityStats[r.toLowerCase()],
        }));

        return NextResponse.json({rarityStats: rarityList});
    } catch (err: unknown) {
        let message = 'Nieznany błąd';
        if (err instanceof Error) message = err.message;
        return NextResponse.json({error: message}, {status: 500});
    }
}
