import {NextResponse} from "next/server";
import {recordIdSchema} from "@/lib/validation/social";
import {getDb} from "@/server/db/client";
import {requireUser, route} from "@/server/http/handler";
import {cancelTrade} from "@/server/services/trades";

export const POST = route<{params: Promise<{id: string}>}>(async (req, {params}) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const id = recordIdSchema.parse((await params).id);
    await cancelTrade(db, user.id, id);
    return NextResponse.json({success: true});
});
