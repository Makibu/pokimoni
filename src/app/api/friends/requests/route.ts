import {NextResponse} from "next/server";
import {friendRequestSchema} from "@/lib/validation/social";
import {getDb} from "@/server/db/client";
import {parseBody, requireUser, route} from "@/server/http/handler";
import {sendFriendRequest} from "@/server/services/friends";

export const POST = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const {username} = await parseBody(req, friendRequestSchema);
    return NextResponse.json(await sendFriendRequest(db, user.id, username), {status: 201});
});
