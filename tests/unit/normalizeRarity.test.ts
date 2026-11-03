import {describe, expect, it} from "vitest";
import {normalizeRarity} from "@/lib/normalizeRarity";

describe("normalizeRarity", () => {
    it("lowercases and trims rarity names from the card catalog", () => {
        expect(normalizeRarity("  Special Illustration Rare ")).toBe("special illustration rare");
    });
});
