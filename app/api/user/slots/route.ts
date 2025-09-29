import {NextResponse} from 'next/server';
import {supabaseServer} from '@/lib/supabaseServer';

export async function PATCH(req: Request) {
    const body = await req.json();
    const {uid, slot, card_id} = body;

    if (!uid || !slot || !['slot_1', 'slot_2'].includes(slot)) {
        return NextResponse.json({error: 'Brak uid lub niepoprawny slot'}, {status: 400});
    }

    const {data, error} = await supabaseServer
        .from('user_stats')
        .update({[slot]: card_id ?? null})
        .eq('uid', uid)
        .select()
        .single();

    if (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }

    return NextResponse.json({data});
}

export async function GET(req: Request) {
    const {searchParams} = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
        return NextResponse.json({error: "Brak uid w zapytaniu"}, {status: 400});
    }

    const {data, error} = await supabaseServer
        .from("user_stats")
        .select(`
            slot_1,
            slot_2,
            cards_1:slot_1(id, name, rarity, income),
            cards_2:slot_2(id, name, rarity, income)
        `)
        .eq("uid", uid)
        .single();

    if (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }

    return NextResponse.json({slots: data});
}

