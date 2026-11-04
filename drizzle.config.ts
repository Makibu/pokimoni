import {defineConfig} from "drizzle-kit";
import {secureConnectionUrl} from "./src/server/db/connection";

const url = process.env.DATABASE_URL;

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/server/db/schema.ts",
    out: "./drizzle",
    schemaFilter: ["game"],
    dbCredentials: {url: url ? secureConnectionUrl(url) : ""},
    strict: true,
});
