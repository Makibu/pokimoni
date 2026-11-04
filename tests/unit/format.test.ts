import {describe, expect, it} from "vitest";
import {coinsAccusative, polishPlural} from "@/lib/format";

describe("polishPlural", () => {
    const form = (count: number) => polishPlural(count, "karta", "karty", "kart");

    it.each([
        [1, "karta"],
        [2, "karty"],
        [4, "karty"],
        [5, "kart"],
        [11, "kart"],
        [12, "kart"],
        [14, "kart"],
        [21, "kart"],
        [22, "karty"],
        [24, "karty"],
        [0, "kart"],
        [112, "kart"],
        [122, "karty"],
    ])("%i → %s", (count, expected) => {
        expect(form(count)).toBe(expected);
    });
});

describe("coinsAccusative", () => {
    it("declines the word as used in a sentence", () => {
        expect(coinsAccusative(1)).toBe("1 monetę");
        expect(coinsAccusative(24)).toBe("24 monety");
        expect(coinsAccusative(100)).toBe("100 monet");
    });
});
