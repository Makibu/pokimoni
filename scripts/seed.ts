// Loads the static catalog into the database pointed to by DATABASE_URL.
// Usage: npm run db:seed   (after npm run db:migrate)
import {getDb} from "@/server/db/client";
import {seedCatalog} from "@/server/db/seed";

await seedCatalog(getDb());
console.log("Catalog seeded");
process.exit(0);
