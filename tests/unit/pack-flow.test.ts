import {describe, expect, it} from "vitest";
import {
    canOpenAgain,
    type FlowEvent,
    nextStage,
    type PackToOpen,
    revealEffect,
    type Stage,
} from "@/features/pack-opening/flow";

const CARDS = 5;

function run(start: Stage, events: FlowEvent[]): Stage {
    return events.reduce((stage, event) => nextStage(stage, event, CARDS), start);
}

describe("pack opening flow", () => {
    it("goes through the whole ritual in order", () => {
        expect(run({name: "offer"}, ["bought"])).toEqual({name: "sealed"});
        expect(run({name: "sealed"}, ["cut"])).toEqual({name: "torn"});
        expect(run({name: "torn"}, ["opened"])).toEqual({name: "reveal", index: 0});
        expect(run({name: "reveal", index: 0}, ["next", "next"])).toEqual({name: "reveal", index: 2});
    });

    it("shows the summary after the last card", () => {
        expect(run({name: "reveal", index: CARDS - 1}, ["next"])).toEqual({name: "summary"});
    });

    it.each<Stage>([{name: "sealed"}, {name: "torn"}, {name: "reveal", index: 2}])(
        "skips to the summary from $name",
        (stage) => {
            expect(nextStage(stage, "skip", CARDS)).toEqual({name: "summary"});
        },
    );

    it("cannot skip before the pack is bought", () => {
        expect(nextStage({name: "offer"}, "skip", CARDS)).toEqual({name: "offer"});
    });

    it("starts over with a sealed pack when another one is bought", () => {
        expect(nextStage({name: "summary"}, "bought", CARDS)).toEqual({name: "sealed"});
    });

    it("ignores events that do not belong to the current stage", () => {
        expect(nextStage({name: "offer"}, "cut", CARDS)).toEqual({name: "offer"});
        expect(nextStage({name: "sealed"}, "next", CARDS)).toEqual({name: "sealed"});
        expect(nextStage({name: "torn"}, "cut", CARDS)).toEqual({name: "torn"});
        expect(nextStage({name: "reveal", index: 1}, "bought", CARDS)).toEqual({name: "reveal", index: 1});
    });
});

describe("opening another pack", () => {
    const pack = (source: PackToOpen["source"], price: number): PackToOpen => ({
        setId: "sv1",
        name: "Set",
        logo: "logo.png",
        price,
        source,
    });

    it("needs the full price for a paid pack", () => {
        expect(canOpenAgain(pack("shop", 150), 150, 0)).toBe(true);
        expect(canOpenAgain(pack("shop", 150), 149, 3)).toBe(false);
        expect(canOpenAgain(pack("daily_pack", 105), 105, 0)).toBe(true);
    });

    it("needs a voucher for a free pack, whatever the coins", () => {
        expect(canOpenAgain(pack("voucher", 150), 0, 1)).toBe(true);
        expect(canOpenAgain(pack("voucher", 150), 9999, 0)).toBe(false);
    });
});

describe("reveal effects", () => {
    it.each([
        ["common", "none"],
        ["uncommon", "none"],
        ["rare", "glow"],
        ["double rare", "glow"],
        ["ultra rare", "shine"],
        ["ace spec rare", "shine"],
        ["illustration rare", "burst"],
        ["special illustration rare", "burst"],
        ["hyper rare", "burst"],
        ["secret rare", "burst"],
    ])("%s gets %s", (rarity, effect) => {
        expect(revealEffect(rarity)).toBe(effect);
    });

    it("treats an unknown rarity as ordinary", () => {
        expect(revealEffect("promo")).toBe("none");
    });
});
