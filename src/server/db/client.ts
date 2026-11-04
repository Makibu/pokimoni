import {drizzle} from "drizzle-orm/node-postgres";
import {Pool} from "pg";
import {secureConnectionUrl} from "./connection";
import * as schema from "./schema";
import type {Db} from "./types";

const globalForDb = globalThis as unknown as {db?: Db};

/**
 * Lazily created pool, reused across hot reloads in development. Connects through the Supabase pooler
 * in transaction mode. Uses `pg`, not postgres.js: with more queries than connections, postgres.js
 * stalled through this pooler for over 30 s in tests, `pg` did not (see AUDIT/IMPLEMENTATION_LOG.md).
 */
export function getDb(): Db {
    if (!globalForDb.db) {
        const url = process.env.DATABASE_URL;
        if (!url) throw new Error("DATABASE_URL is not set");
        const pool = new Pool({
            connectionString: secureConnectionUrl(url),
            max: Number(process.env.DB_POOL_MAX ?? 5),
            connectionTimeoutMillis: 10_000,
        });
        // Without a listener, a dropped idle connection would crash the whole process.
        pool.on("error", (error) => console.error("Idle database connection failed:", error.message));
        globalForDb.db = drizzle(pool, {schema});
    }
    return globalForDb.db;
}

/** Replaces the connection, so tests can run route handlers against an in-memory database. */
export function setDb(db: Db) {
    globalForDb.db = db;
}
