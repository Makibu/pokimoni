import {NextResponse} from "next/server";
import {playerSearchSchema} from "@/lib/validation/social";
import {getDb} from "@/server/db/client";
import {requireUser, route} from "@/server/http/handler";
import {searchPlayers} from "@/server/services/players";

export const GET = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const query = playerSearchSchema.parse(req.nextUrl.searchParams.get("q") ?? "");
    return NextResponse.json(await searchPlayers(db, user.id, query));
});
