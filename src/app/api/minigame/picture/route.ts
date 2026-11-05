import {NextResponse} from "next/server";
import {getDb} from "@/server/db/client";
import {requireUser, route} from "@/server/http/handler";
import {getCluePicture} from "@/server/services/clue-picture";

export const GET = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const picture = await getCluePicture(db, user.id);
    return new NextResponse(new Uint8Array(picture), {
        headers: {"Content-Type": "image/webp", "Cache-Control": "no-store"},
    });
});
