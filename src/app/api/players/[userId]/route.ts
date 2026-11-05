import {NextResponse} from "next/server";
import {playerIdSchema} from "@/lib/validation/social";
import {getDb} from "@/server/db/client";
import {requireUser, route} from "@/server/http/handler";
import {getProfile} from "@/server/services/profile";

export const GET = route<{params: Promise<{userId: string}>}>(async (req, {params}) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const userId = playerIdSchema.parse((await params).userId);
    return NextResponse.json(await getProfile(db, user.id, userId));
});
