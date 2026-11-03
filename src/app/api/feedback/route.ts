import {NextResponse} from "next/server";
import {feedbackSchema} from "@/lib/validation/game";
import {getDb} from "@/server/db/client";
import {feedback} from "@/server/db/schema";
import {parseBody, requireUser, route} from "@/server/http/handler";

export const POST = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const {description} = await parseBody(req, feedbackSchema);
    await db.insert(feedback).values({userId: user.id, description});
    return NextResponse.json({success: true}, {status: 201});
});
