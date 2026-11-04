import {defineConfig, devices} from "@playwright/test";
import base from "./playwright.config";

/** Loading-speed measurement: `npx playwright test -c playwright.perf.config.ts`. Needs a production build. */
export default defineConfig({
    ...base,
    testDir: "tests/perf",
    fullyParallel: false,
    workers: 1,
    timeout: 300_000,
    reporter: "list",
    projects: [{name: "perf", use: {...devices["Pixel 7"]}}],
});
