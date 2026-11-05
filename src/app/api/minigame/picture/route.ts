import {NextResponse} from "next/server";
import {getDb} from "@/server/db/client";
import {AppError} from "@/server/http/errors";
import {requireUser, route} from "@/server/http/handler";
import {clueSourceUrl, fetchCardImage, renderClue} from "@/server/minigames/clue-image";
import {getCurrentClue} from "@/server/services/minigames";

export const GET = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const clue = await getCurrentClue(db, user.id);
    if (!clue) throw new AppError(404, "no_picture", "Nie ma obrazka do odgadnięcia");

    const source = await fetchCardImage(clueSourceUrl(clue.round, clue.difficulty));
    const picture = await renderClue(source, clue.round, clue.difficulty);
    return new NextResponse(new Uint8Array(picture), {
        headers: {"Content-Type": "image/webp", "Cache-Control": "no-store"},
    });
});
