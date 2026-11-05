import {isRateLimited, LIMITS, recordAttempt} from "@/server/auth/rate-limit";
import {feedback} from "@/server/db/schema";
import type {Db} from "@/server/db/types";
import {AppError} from "@/server/http/errors";

export async function sendFeedback(db: Db, userId: string, description: string) {
    const key = `feedback:user:${userId}`;
    if (await isRateLimited(db, key, LIMITS.feedbackPerUser)) {
        throw new AppError(429, "too_many_attempts", "Zbyt wiele wiadomości. Spróbuj ponownie za kilka minut");
    }
    await recordAttempt(db, key);
    await db.insert(feedback).values({userId, description});
}
