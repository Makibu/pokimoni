// One-off, read-only export of the static game catalog (sets, cards, achievements, badges)
// from the legacy Supabase `public` schema into data/catalog/*.json.
// Usage: node --env-file=.env.local scripts/export-catalog.mjs
import {createClient} from "@supabase/supabase-js";
import {mkdir, writeFile} from "node:fs/promises";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

const db = createClient(url, key);
const PAGE = 1000;

async function fetchAll(table, orderBy) {
    const rows = [];
    for (let from = 0; ; from += PAGE) {
        const {data, error} = await db
            .from(table)
            .select("*")
            .order(orderBy)
            .range(from, from + PAGE - 1);
        if (error) throw new Error(`${table}: ${error.message}`);
        rows.push(...data);
        if (data.length < PAGE) return rows;
    }
}

const tables = [
    ["sets", "id"],
    ["cards", "id"],
    ["achievements", "id"],
    ["badges", "id"],
];

await mkdir("data/catalog", {recursive: true});
for (const [table, orderBy] of tables) {
    const rows = await fetchAll(table, orderBy);
    await writeFile(`data/catalog/${table}.json`, JSON.stringify(rows, null, 2) + "\n");
    console.log(`${table}: ${rows.length}`);
}
