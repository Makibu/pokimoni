// In-memory Postgres for E2E tests: PGlite with migrations and catalog, exposed over the Postgres
// wire protocol so the app connects to it like to a real server. No Docker needed.
import {PGlite} from "@electric-sql/pglite";
import {PGLiteSocketServer} from "@electric-sql/pglite-socket";
import {drizzle} from "drizzle-orm/pglite";
import {migrate} from "drizzle-orm/pglite/migrator";
import {gameDayOf} from "@/domain/game-day";
import type {MinigameDifficulty} from "@/domain/economy";
import type {Minigame} from "@/domain/minigames";
import * as schema from "@/server/db/schema";
import {seedCatalog} from "@/server/db/seed";

const PORT = Number(process.env.E2E_DB_PORT ?? 5544);

async function main() {
    const client = new PGlite();
    const db = drizzle(client, {schema});
    await migrate(db, {migrationsFolder: "drizzle"});
    await seedCatalog(db);
    // Fixes the day's game, so tests can play a real one instead of whichever the day would draw.
    const [game, difficulty] = (process.env.E2E_MINIGAME ?? "").split(":");
    if (game) {
        await db.insert(schema.minigameDays).values({
            gameDay: gameDayOf(new Date()),
            game: game as Minigame,
            difficulty: difficulty as MinigameDifficulty,
            payload: {},
        });
    }
    const server = new PGLiteSocketServer({db: client, port: PORT, host: "127.0.0.1"});
    await server.start();
    console.log(`E2E database listening on ${PORT}`);
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
