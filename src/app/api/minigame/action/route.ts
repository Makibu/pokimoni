import {NextResponse} from "next/server";
import {getDb} from "@/server/db/client";
import {parseBody, requireUser, route} from "@/server/http/handler";
import {minigameActionSchema} from "@/lib/validation/daily";
import {playMinigame} from "@/server/services/minigames";

export const POST = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const action = await parseBody(req, minigameActionSchema);
    return NextResponse.json(await playMinigame(db, user.id, action));
});
