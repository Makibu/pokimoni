import {NextResponse} from "next/server";
import {openPackSchema} from "@/lib/validation/game";
import {getDb} from "@/server/db/client";
import {parseBody, requireUser, route} from "@/server/http/handler";
import {openPack} from "@/server/services/packs";

export const POST = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const input = await parseBody(req, openPackSchema);
    return NextResponse.json(await openPack(db, user.id, input));
});
