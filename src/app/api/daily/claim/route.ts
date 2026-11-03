import {NextResponse} from "next/server";
import {getDb} from "@/server/db/client";
import {requireUser, route} from "@/server/http/handler";
import {claimDailyReward} from "@/server/services/wallet";

export const POST = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    return NextResponse.json(await claimDailyReward(db, user.id));
});
