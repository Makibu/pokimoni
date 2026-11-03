import {describe, expect, it} from "vitest";
import {addDays, gameDayOf} from "@/domain/game-day";

describe("gameDayOf", () => {
    it.each([
        ["winter, 09:59:59 CET belongs to the previous day", "2026-11-03T08:59:59Z", "2026-11-02"],
        ["winter, 10:00 CET starts the new day", "2026-11-03T09:00:00Z", "2026-11-03"],
        ["winter, just before midnight CET", "2026-11-03T22:59:00Z", "2026-11-03"],
        ["winter, after midnight but before 10:00 CET", "2026-11-04T05:00:00Z", "2026-11-03"],
        ["summer, 09:59 CEST belongs to the previous day", "2026-07-01T07:59:00Z", "2026-06-30"],
        ["summer, 10:00 CEST starts the new day", "2026-07-01T08:00:00Z", "2026-07-01"],
        ["DST start day, 10:00 CEST", "2026-03-29T08:00:00Z", "2026-03-29"],
        ["DST start day, 09:59 CEST", "2026-03-29T07:59:00Z", "2026-03-28"],
        ["DST end day, 10:00 CET", "2026-10-25T09:00:00Z", "2026-10-25"],
        ["DST end day, 09:59 CET", "2026-10-25T08:59:00Z", "2026-10-24"],
        ["new year, 09:00 CET on Jan 1st belongs to Dec 31st", "2027-01-01T08:00:00Z", "2026-12-31"],
    ])("%s", (_, instant, expected) => {
        expect(gameDayOf(new Date(instant))).toBe(expected);
    });
});

describe("addDays", () => {
    it("crosses month and year boundaries", () => {
        expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
        expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
        expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    });
});
