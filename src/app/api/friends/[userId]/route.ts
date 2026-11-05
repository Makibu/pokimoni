import {NextResponse} from "next/server";
import {playerIdSchema} from "@/lib/validation/social";
import {getDb} from "@/server/db/client";
import {requireUser, route} from "@/server/http/handler";
import {removeFriend} from "@/server/services/friends";

export const DELETE = route<{params: Promise<{userId: string}>}>(async (req, {params}) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const friendId = playerIdSchema.parse((await params).userId);
    await removeFriend(db, user.id, friendId);
    return NextResponse.json({success: true});
});
