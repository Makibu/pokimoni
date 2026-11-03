import {NextRequest, NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const {uid, description} = body as {
        uid: string;
        description: string;
    };

    if (!uid || !description) {
        return NextResponse.json({error: "Missing parameters"}, {status: 400});
    }

    const {error} = await supabaseServer.from("feedback").insert({uid, description});

    if (error) NextResponse.json({message: error.message}, {status: 500})

    return NextResponse.json({success: true});
}