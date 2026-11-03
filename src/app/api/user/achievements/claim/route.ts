import {NextRequest, NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
    const {uid, achievement_id} = await req.json();
    if (!uid || !achievement_id) {
        return NextResponse.json({error: "Missing parameters"}, {status: 400});
    }

    const {error} = await supabaseServer
        .from("user_achievements")
        .update({claimed_flag: true})
        .eq("uid", uid)
        .eq("achievement_id", achievement_id)
        .select()
        .single();

    if (error) return NextResponse.json({error: error.message}, {status: 500});

    return NextResponse.json({success: true});
}
