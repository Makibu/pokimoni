import {supabaseServer} from "@/lib/supabaseServer";
import {NextResponse} from "next/server";

export async function GET(reg: Request) {
    const {data, error} = await supabaseServer.from("badges").select("*")

    if (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }

    return NextResponse.json({achievements: data});
}