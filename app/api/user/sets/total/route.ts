import {NextResponse} from 'next/server';
import {supabaseServer} from '@/lib/supabaseServer';

export async function GET(req: Request) {
    const {searchParams} = new URL(req.url);
    const uid = searchParams.get('uid');

    if (!uid) {
        return NextResponse.json({error: "Brak uid w zapytaniu"}, {status: 400});
    }

    const {data, error} = await supabaseServer
        .from('user_cards')
        .select('card_id')
        .eq('uid', uid);

    if (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }

    const setsCount: Record<string, number> = {};

    data?.forEach((card: { card_id: string }) => {
        const [setId] = card.card_id.split('-');
        if (!setsCount[setId]) setsCount[setId] = 0;
        setsCount[setId] += 1;
    });

    return NextResponse.json({setsCount});
}
