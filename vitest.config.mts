import {defineConfig} from "vitest/config";

export default defineConfig({
    resolve: {tsconfigPaths: true},
    test: {
        include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
        environment: "node",
        env: {
            SESSION_SECRET: "test-only-secret-test-only-secret-1234",
            BCRYPT_COST: "4",
        },
    },
});
