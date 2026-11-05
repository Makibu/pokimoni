import {NextResponse} from "next/server";
import {getDb} from "@/server/db/client";
import {requireUser, route} from "@/server/http/handler";
import {questSlotSchema} from "@/lib/validation/daily";
import {claimQuest} from "@/server/services/quests";

export const POST = route<{params: Promise<{slot: string}>}>(async (req, {params}) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const slot = questSlotSchema.parse((await params).slot);
    return NextResponse.json(await claimQuest(db, user.id, slot));
});
