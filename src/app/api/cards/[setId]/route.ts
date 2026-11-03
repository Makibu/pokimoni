import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";

export async function GET(
    req: Request,
    context: { params: Promise<{ setId: string }> }
) {
    const {setId} = await context.params;

    const {data, error} = await supabaseServer
        .from("cards")
        .select("*")
        .eq("set_id", setId)

    if (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }

    return NextResponse.json({cards: data});
}
