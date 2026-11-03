import {defineConfig, globalIgnores} from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Legacy files that read the user id from localStorage inside effects. They are rewritten or
// removed in phases 2–3 of AUDIT/REFACTORING_PLAN.md; delete this override together with them.
const legacyEffectFiles = [
    "app/achievements/page.tsx",
    "app/page.tsx",
    "components/data-display/AchievementTile.tsx",
    "components/home/IncomeSlots.tsx",
    "components/home/UserMenu.tsx",
    "components/shop/MinesweeperDialog.tsx",
    "components/shop/OpenPackDialog.tsx",
    "components/shop/SudokuDialog.tsx",
    "context/authContext.tsx",
    "hooks/queries/*.ts",
    "hooks/useIsMobile.ts",
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
    globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "data/**"]),
]);
