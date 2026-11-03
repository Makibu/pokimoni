import {NextResponse} from "next/server";
import {getDb} from "@/server/db/client";
import {requireUser, route} from "@/server/http/handler";
import {getShop} from "@/server/services/packs";

export const GET = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    return NextResponse.json(await getShop(db, user.id));
});
