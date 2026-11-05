import {and, asc, inArray, like, ne} from "drizzle-orm";
import {isRateLimited, LIMITS, recordAttempt} from "@/server/auth/rate-limit";
import {users} from "@/server/db/schema";
import type {Db, Tx} from "@/server/db/types";
import {AppError} from "@/server/http/errors";

/** What one player may see about another. Never add the email or anything else from the account. */
export type PublicPlayer = {id: string; username: string; avatar: number | null};

export const publicPlayerFields = {id: users.id, username: users.username, avatar: users.avatar};

export async function loadPlayers(db: Db | Tx, ids: string[]): Promise<Map<string, PublicPlayer>> {
    if (ids.length === 0) return new Map();
    const rows = await db.select(publicPlayerFields).from(users).where(inArray(users.id, ids));
    return new Map(rows.map((row) => [row.id, row]));
}

const SEARCH_RESULTS = 10;

/** Finds players whose nick starts with the query, whatever its case. */
export async function searchPlayers(db: Db, userId: string, query: string): Promise<PublicPlayer[]> {
    const key = `player-search:user:${userId}`;
    if (await isRateLimited(db, key, LIMITS.playerSearchPerUser)) {
        throw new AppError(429, "too_many_attempts", "Zbyt wiele wyszukiwań. Spróbuj ponownie za kilka minut");
    }
    await recordAttempt(db, key);

    // "_" is allowed in nicks, but in LIKE it would match any character.
    const pattern = `${query.toLowerCase().replace(/[\\%_]/g, "\\$&")}%`;
    return db
        .select(publicPlayerFields)
        .from(users)
        .where(and(like(users.usernameKey, pattern), ne(users.id, userId)))
        .orderBy(asc(users.usernameKey))
        .limit(SEARCH_RESULTS);
}
