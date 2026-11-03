import {PGlite} from "@electric-sql/pglite";
import {drizzle} from "drizzle-orm/pglite";
import {migrate} from "drizzle-orm/pglite/migrator";
import * as schema from "@/server/db/schema";
import {seedCatalog} from "@/server/db/seed";
import type {Db} from "@/server/db/types";

export type TestDb = {db: Db; client: PGlite; close: () => Promise<void>};

/** Fresh in-memory Postgres with all migrations applied and, by default, the catalog loaded. */
export async function createTestDb(options: {seed?: boolean} = {}): Promise<TestDb> {
    const client = new PGlite();
    const db = drizzle(client, {schema});
    await migrate(db, {migrationsFolder: "drizzle"});
    if (options.seed ?? true) await seedCatalog(db);
    return {db, client, close: () => client.close()};
}
