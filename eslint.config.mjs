import {defineConfig, globalIgnores} from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Legacy files that read the user id from localStorage inside effects. They are rewritten or
// removed in phases 2–3 of AUDIT/REFACTORING_PLAN.md; delete this override together with them.
const legacyEffectFiles = [
    "src/app/achievements/page.tsx",
    "src/app/page.tsx",
    "src/components/data-display/AchievementTile.tsx",
    "src/components/home/IncomeSlots.tsx",
    "src/components/home/UserMenu.tsx",
    "src/components/shop/MinesweeperDialog.tsx",
    "src/components/shop/OpenPackDialog.tsx",
    "src/components/shop/SudokuDialog.tsx",
    "src/context/authContext.tsx",
    "src/hooks/queries/*.ts",
    "src/hooks/useIsMobile.ts",
];

export default defineConfig([
    ...nextVitals,
    ...nextTs,
    {
        files: legacyEffectFiles,
        rules: {
            "react-hooks/set-state-in-effect": "warn",
            "react-hooks/immutability": "warn",
        },
    },
    globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "data/**", "playwright-report/**", "test-results/**"]),
]);
