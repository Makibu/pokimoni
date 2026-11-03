import {drizzle} from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import type {Db} from "./types";

const globalForDb = globalThis as unknown as {db?: Db};

/**
 * Lazily created connection, reused across hot reloads in development. Connects through the
 * Supabase pooler in transaction mode, which does not support prepared statements.
 */
export function getDb(): Db {
    if (!globalForDb.db) {
        const url = process.env.DATABASE_URL;
        if (!url) throw new Error("DATABASE_URL is not set");
        const client = postgres(url, {prepare: false, max: 5});
        globalForDb.db = drizzle(client, {schema});
    }
    return globalForDb.db;
}
