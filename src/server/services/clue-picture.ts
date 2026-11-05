import {isRateLimited, LIMITS, recordAttempt} from "@/server/auth/rate-limit";
import type {Db} from "@/server/db/types";
import {AppError} from "@/server/http/errors";
import {clueSourceUrl, fetchCardImage, renderClue} from "@/server/minigames/clue-image";
import {getCurrentClue} from "./minigames";

/** The picture to guess now. Each call downloads and processes an image, the costliest thing a player can repeat. */
export async function getCluePicture(db: Db, userId: string): Promise<Buffer> {
    const key = `clue-picture:user:${userId}`;
    if (await isRateLimited(db, key, LIMITS.cluePicturesPerUser)) {
        throw new AppError(429, "too_many_attempts", "Zbyt wiele prób. Spróbuj ponownie za kilka minut");
    }
    await recordAttempt(db, key);

    const clue = await getCurrentClue(db, userId);
    if (!clue) throw new AppError(404, "no_picture", "Nie ma obrazka do odgadnięcia");

    const source = await fetchCardImage(clueSourceUrl(clue.round, clue.difficulty));
    return renderClue(source, clue.round, clue.difficulty);
}
