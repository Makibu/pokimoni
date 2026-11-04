import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

function tokens(selector: string): Record<string, string> {
    const start = css.indexOf(`${selector} {`);
    const block = css.slice(start, css.indexOf("}", start));
    return Object.fromEntries(
        [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/g)].map((match) => [match[1], match[2]]),
    );
}

function luminance(hex: string): number {
    const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
    const [r, g, b] = channels.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
    const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (lighter + 0.05) / (darker + 0.05);
}

const SURFACES = ["background", "card", "popover", "secondary", "lilac", "pink", "aqua", "peach", "sun"];
const TEXT_MINIMUM = 4.5;
const CONTROL_MINIMUM = 3;

describe.each([
    ["light", ":root"],
    ["dark", ".dark"],
])("%s theme", (_name, selector) => {
    const theme = tokens(selector);

    it.each(SURFACES)("body text is readable on %s", (surface) => {
        expect(contrast(theme.foreground, theme[surface])).toBeGreaterThanOrEqual(TEXT_MINIMUM);
    });

    it.each(["background", "card", "secondary"])("secondary text is readable on %s", (surface) => {
        expect(contrast(theme["muted-foreground"], theme[surface])).toBeGreaterThanOrEqual(TEXT_MINIMUM);
    });

    it.each(["background", "card", "secondary", "lilac", "sun"])("accent text is readable on %s", (surface) => {
        expect(contrast(theme["accent-ink"], theme[surface])).toBeGreaterThanOrEqual(TEXT_MINIMUM);
    });

    // Placeholders are decorative, so the bar is "visibly a shape", not a text contrast level.
    it.each(["background", "card", "lilac", "pink", "aqua", "peach", "sun"])("skeletons show on %s", (surface) => {
        expect(contrast(theme.skeleton, theme[surface])).toBeGreaterThanOrEqual(1.15);
    });

    it.each([
        ["primary-foreground", "primary"],
        ["ink-foreground", "ink"],
        ["destructive-foreground", "destructive"],
        ["nav-foreground", "nav"],
        ["income", "card"],
        ["destructive", "card"],
    ])("%s is readable on %s", (text, surface) => {
        expect(contrast(theme[text], theme[surface])).toBeGreaterThanOrEqual(TEXT_MINIMUM);
    });

    it.each([
        ["input", "card"],
        ["primary", "secondary"],
        ["dot", "card"],
        ["ring", "background"],
        ["ink", "peach"],
        ["streak", "peach"],
    ])("%s stands out from %s", (control, surface) => {
        expect(contrast(theme[control], theme[surface])).toBeGreaterThanOrEqual(CONTROL_MINIMUM);
    });
});
