import {NextResponse} from "next/server";
import {markReadSchema} from "@/lib/validation/social";
import {getDb} from "@/server/db/client";
import {parseBody, requireUser, route} from "@/server/http/handler";
import {markNotificationsRead} from "@/server/services/notifications";

export const POST = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const {upToId} = await parseBody(req, markReadSchema);
    return NextResponse.json(await markNotificationsRead(db, user.id, upToId));
});
