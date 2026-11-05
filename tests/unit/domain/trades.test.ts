import {describe, expect, it} from "vitest";
import {MAX_CARD_COPIES} from "@/domain/economy";
import {friendPair, freeCopies, receiveCopy} from "@/domain/trades";

describe("freeCopies", () => {
    it("leaves out copies in slots and in open offers", () => {
        expect(freeCopies(5, 1, 2)).toBe(2);
    });

    it("is zero when everything is in use", () => {
        expect(freeCopies(2, 1, 1)).toBe(0);
    });

    it("never goes below zero", () => {
        expect(freeCopies(1, 1, 1)).toBe(0);
    });
});

describe("receiveCopy", () => {
    it("adds a first copy", () => {
        expect(receiveCopy(0)).toEqual({quantity: 1, lost: false});
    });

    it("still fits the last copy under the limit", () => {
        expect(receiveCopy(MAX_CARD_COPIES - 1)).toEqual({quantity: MAX_CARD_COPIES, lost: false});
    });

    it("loses a copy above the limit", () => {
        expect(receiveCopy(MAX_CARD_COPIES)).toEqual({quantity: MAX_CARD_COPIES, lost: true});
    });
});

describe("friendPair", () => {
    it("gives the same pair in either order, smaller id first", () => {
        expect(friendPair("a", "b")).toEqual({userA: "a", userB: "b"});
        expect(friendPair("b", "a")).toEqual({userA: "a", userB: "b"});
    });
});
