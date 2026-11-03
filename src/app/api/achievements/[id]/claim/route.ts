import {NextResponse} from "next/server";
import {getDb} from "@/server/db/client";
import {AppError} from "@/server/http/errors";
import {requireUser, route} from "@/server/http/handler";
import {claimAchievement} from "@/server/services/progress";

export const POST = route<{params: Promise<{id: string}>}>(async (req, {params}) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const id = Number((await params).id);
    if (!Number.isInteger(id)) throw new AppError(404, "not_found", "Nie znaleziono osiągnięcia");
    await claimAchievement(db, user.id, id);
    return NextResponse.json({success: true});
});
