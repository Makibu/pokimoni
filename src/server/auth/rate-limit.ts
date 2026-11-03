import {eq, sql} from "drizzle-orm";
import {authAttempts} from "@/server/db/schema";
import type {Db} from "@/server/db/types";

const WINDOW_MS = 15 * 60 * 1000;

export const LIMITS = {
    loginPerEmail: 10,
    loginPerIp: 50,
    registerPerIp: 10,
} as const;

export async function isRateLimited(db: Db, key: string, max: number, now = new Date()): Promise<boolean> {
    const [row] = await db.select().from(authAttempts).where(eq(authAttempts.key, key));
    if (!row || now.getTime() - row.windowStart.getTime() >= WINDOW_MS) return false;
    return row.count >= max;
}

/** Counts one attempt, starting a new window when the previous one has expired. */
export async function recordAttempt(db: Db, key: string, now = new Date()): Promise<void> {
    const windowExpired = sql`${authAttempts.windowStart} <= ${new Date(now.getTime() - WINDOW_MS).toISOString()}::timestamptz`;
    await db
        .insert(authAttempts)
        .values({key, windowStart: now, count: 1})
        .onConflictDoUpdate({
            target: authAttempts.key,
            set: {
                count: sql`case when ${windowExpired} then 1 else ${authAttempts.count} + 1 end`,
                windowStart: sql`case when ${windowExpired} then ${now.toISOString()}::timestamptz else ${authAttempts.windowStart} end`,
            },
        });
}

export async function clearAttempts(db: Db, key: string): Promise<void> {
    await db.delete(authAttempts).where(eq(authAttempts.key, key));
}
