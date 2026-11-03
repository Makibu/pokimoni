import {NextResponse} from "next/server";
import {setSlotSchema} from "@/lib/validation/game";
import {getDb} from "@/server/db/client";
import {AppError} from "@/server/http/errors";
import {parseBody, requireUser, route} from "@/server/http/handler";
import {setIncomeSlot} from "@/server/services/wallet";

export const PUT = route<{params: Promise<{slot: string}>}>(async (req, {params}) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const {slot} = await params;
    if (slot !== "1" && slot !== "2") throw new AppError(404, "slot_not_found", "Nie ma takiego slotu");
    const {cardId} = await parseBody(req, setSlotSchema);
    return NextResponse.json(await setIncomeSlot(db, user.id, slot === "1" ? 1 : 2, cardId));
});
