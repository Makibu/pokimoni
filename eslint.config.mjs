import {defineConfig, globalIgnores} from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
    ...nextVitals,
    ...nextTs,
    {
        rules: {
            "no-restricted-syntax": [
                "error",
                {
                    selector: "CallExpression[callee.name='dynamic'][arguments.length<2]",
                    message:
                        "Pass {ssr: false} or a loading component. Without a Suspense boundary of its own, the first render hides the whole page and shows the route's loading screen.",
                },
            ],
        },
    },
    globalIgnores([
        ".next/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
        "data/**",
        "playwright-report/**",
        "test-results/**",
    ]),
]);
