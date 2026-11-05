import {NextResponse} from "next/server";
import {playerIdSchema} from "@/lib/validation/social";
import {getDb} from "@/server/db/client";
import {requireUser, route} from "@/server/http/handler";
import {getTradeOptions} from "@/server/services/trades";

export const GET = route<{params: Promise<{friendId: string}>}>(async (req, {params}) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const friendId = playerIdSchema.parse((await params).friendId);
    return NextResponse.json(await getTradeOptions(db, user.id, friendId));
});
