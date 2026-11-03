import {defineConfig, devices} from "@playwright/test";

const APP_PORT = 3100;
const DB_PORT = 5544;

export default defineConfig({
    testDir: "tests/e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? "github" : "list",
    use: {
        baseURL: `http://localhost:${APP_PORT}`,
        trace: "retain-on-failure",
    },
    projects: [
        {name: "desktop", use: {...devices["Desktop Chrome"]}},
        {name: "mobile", use: {...devices["Pixel 7"]}},
    ],
    webServer: [
        {
            command: "npx tsx scripts/e2e-db.ts",
            port: DB_PORT,
            env: {E2E_DB_PORT: String(DB_PORT)},
            reuseExistingServer: false,
        },
        {
            command: `npm run start -- -p ${APP_PORT}`,
            port: APP_PORT,
            env: {
                // Real environment variables take priority over .env.local, so tests never touch Supabase.
                DATABASE_URL: `postgres://postgres:postgres@127.0.0.1:${DB_PORT}/postgres?sslmode=disable`,
                DB_POOL_MAX: "1",
                SESSION_SECRET: "e2e-only-secret-e2e-only-secret-e2e-only",
                BCRYPT_COST: "4",
            },
            reuseExistingServer: false,
        },
    ],
});
