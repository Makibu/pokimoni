import {NextResponse} from "next/server";
import {isRateLimited, LIMITS, recordAttempt} from "@/server/auth/rate-limit";
import {getDb} from "@/server/db/client";
import {AppError} from "@/server/http/errors";
import {requireUser, route} from "@/server/http/handler";
import {clueSourceUrl, fetchCardImage, renderClue} from "@/server/minigames/clue-image";
import {getCurrentClue} from "@/server/services/minigames";

export const GET = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);

    // Each request downloads and processes an image, which is the costliest thing a player can ask for repeatedly.
    const key = `clue-picture:user:${user.id}`;
    if (await isRateLimited(db, key, LIMITS.cluePicturesPerUser)) {
        throw new AppError(429, "too_many_attempts", "Zbyt wiele prób. Spróbuj ponownie za kilka minut");
    }
    await recordAttempt(db, key);

    const clue = await getCurrentClue(db, user.id);
    if (!clue) throw new AppError(404, "no_picture", "Nie ma obrazka do odgadnięcia");

    const source = await fetchCardImage(clueSourceUrl(clue.round, clue.difficulty));
    const picture = await renderClue(source, clue.round, clue.difficulty);
    return new NextResponse(new Uint8Array(picture), {
        headers: {"Content-Type": "image/webp", "Cache-Control": "no-store"},
    });
});
