import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";

export async function GET() {
    const {data, error} = await supabaseServer.rpc("choose_daily_pack_for_today");

    if (error) {
        return NextResponse.json({error: "Błąd po stronie bazy danych."}, {status: 500});
    }

    if (!data || !data[0]) {
        return NextResponse.json({error: "Nie udało się wybrać paczki dnia."}, {status: 500});
    }

    const dailyPack = data[0];

    const {data: setRow, error: setError} = await supabaseServer
        .from("sets")
        .select("*")
        .eq("id", dailyPack.chosen_set_id)
        .single();

    if (setError || !setRow) {
        return NextResponse.json({error: "Nie znaleziono danych zestawu."}, {status: 404});
    }

    return NextResponse.json({
        date: dailyPack.pack_date,
        set: setRow,
    });
}
