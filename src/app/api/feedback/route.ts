import {NextResponse} from "next/server";
import {feedbackSchema} from "@/lib/validation/game";
import {getDb} from "@/server/db/client";
import {parseBody, requireUser, route} from "@/server/http/handler";
import {sendFeedback} from "@/server/services/feedback";

export const POST = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const {description} = await parseBody(req, feedbackSchema);
    await sendFeedback(db, user.id, description);
    return NextResponse.json({success: true}, {status: 201});
});
