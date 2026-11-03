import {NextResponse} from "next/server";
import {getDb} from "@/server/db/client";
import {requireUser, route} from "@/server/http/handler";
import {listCollectionSets} from "@/server/services/collection";

export const GET = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    return NextResponse.json(await listCollectionSets(db, user.id));
});
