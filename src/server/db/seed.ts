import {getTableColumns, sql, type SQL} from "drizzle-orm";
import type {PgColumn, PgTable} from "drizzle-orm/pg-core";
import {catalogAchievements, catalogBadges, catalogCards, catalogSets} from "./catalog";
import {achievements, badges, cards, sets} from "./schema";
import type {Db} from "./types";

const BATCH_SIZE = 500;

/** Inserts rows in batches; existing rows (same key) are updated in place, so seeding is repeatable. */
async function upsert<T extends PgTable>(db: Db, table: T, key: PgColumn, rows: T["$inferInsert"][]) {
    const set: Record<string, SQL> = {};
    for (const [property, column] of Object.entries(getTableColumns(table))) {
        if (column !== key) set[property] = sql.raw(`excluded."${column.name}"`);
    }
    for (let start = 0; start < rows.length; start += BATCH_SIZE) {
        await db
            .insert(table)
            .values(rows.slice(start, start + BATCH_SIZE))
            .onConflictDoUpdate({target: key, set});
    }
}

/** Idempotently loads the static catalog (sets, cards, achievements, badges) from data/catalog. */
export async function seedCatalog(db: Db) {
    await db.transaction(async (tx) => {
        await upsert(tx, sets, sets.id, catalogSets);
        await upsert(tx, cards, cards.id, catalogCards);
        await upsert(tx, achievements, achievements.id, catalogAchievements);
        await upsert(tx, badges, badges.id, catalogBadges);
    });
}
