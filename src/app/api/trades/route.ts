import {NextResponse} from "next/server";
import {createTradeSchema} from "@/lib/validation/social";
import {getDb} from "@/server/db/client";
import {parseBody, requireUser, route} from "@/server/http/handler";
import {createTrade, listTrades} from "@/server/services/trades";

export const GET = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    return NextResponse.json(await listTrades(db, user.id));
});

export const POST = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const input = await parseBody(req, createTradeSchema);
    return NextResponse.json(await createTrade(db, user.id, input), {status: 201});
});
