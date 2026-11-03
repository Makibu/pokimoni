import {describe, expect, it} from "vitest";
import {parseRarity, rarityRank} from "@/domain/rarity";

describe("rarity", () => {
    it("parses catalog spelling", () => {
        expect(parseRarity(" Special Illustration Rare")).toBe("special illustration rare");
    });

    it("rejects unknown rarities", () => {
        expect(() => parseRarity("Shiny Rare")).toThrow("Unknown rarity");
    });

    it("ranks from common to secret rare", () => {
        expect(rarityRank("common")).toBe(1);
        expect(rarityRank("secret rare")).toBe(10);
    });
});
