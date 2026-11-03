import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";

export async function GET() {
    const {data, error} = await supabaseServer.from("sets").select("*").order("name", {ascending: true});

    if (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }

    return NextResponse.json({data});
}
