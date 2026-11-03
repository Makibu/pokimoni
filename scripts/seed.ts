// Loads the static catalog into the database pointed to by DATABASE_URL.
// Usage: npm run db:seed   (after npm run db:migrate)
import {getDb} from "@/server/db/client";
import {seedCatalog} from "@/server/db/seed";

seedCatalog(getDb())
    .then(() => {
        console.log("Catalog seeded");
        process.exit(0);
    })
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : "Seeding failed");
        process.exit(1);
    });
