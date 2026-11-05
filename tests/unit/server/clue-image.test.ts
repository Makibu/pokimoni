import sharp from "sharp";
import {beforeAll, describe, expect, it, vi} from "vitest";
import {clueSourceUrl, fetchCardImage, renderClue} from "@/server/minigames/clue-image";

const WIDTH = 245;
const HEIGHT = 342;
const round = {crop: {x: 0.3, y: 0.2}, options: null};

/** A card with one colour in each part: name strip, art and rules text. */
async function fakeCard() {
    const pixels = Buffer.alloc(WIDTH * HEIGHT * 3);
    for (let y = 0; y < HEIGHT; y++) {
        const part = y / HEIGHT;
        const colour = part < 0.1 ? [255, 0, 0] : part < 0.5 ? [0, 200, 80] : [0, 0, 255];
        for (let x = 0; x < WIDTH; x++) pixels.set(colour, (y * WIDTH + x) * 3);
    }
    return sharp(pixels, {raw: {width: WIDTH, height: HEIGHT, channels: 3}})
        .withMetadata({exif: {IFD0: {ImageDescription: "secret"}}})
        .png()
        .toBuffer();
}

async function pixelsOf(image: Buffer) {
    const {data, info} = await sharp(image).removeAlpha().raw().toBuffer({resolveWithObject: true});
    return {data, info};
}

describe("clue pictures", () => {
    let card: Buffer;

    beforeAll(async () => {
        card = await fakeCard();
    });

    it.each(["easy", "medium", "hard"])("renders a WebP at the %s level", async (difficulty) => {
        const clue = await renderClue(card, round, difficulty);
        const {format, width} = await sharp(clue).metadata();
        expect(format).toBe("webp");
        expect(width).toBe(480);
    });

    it("leaves out the name strip and the rules text", async () => {
        const {data, info} = await pixelsOf(await renderClue(card, round, "hard"));
        for (let i = 0; i < info.width * info.height; i++) {
            const offset = i * info.channels;
            // Only the art's green is there: no red name, no blue rules, apart from compression noise.
            expect(data[offset]).toBeLessThan(60);
            expect(data[offset + 2]).toBeLessThan(120);
        }
    });

    it("removes colour at the medium level", async () => {
        const {data, info} = await pixelsOf(await renderClue(card, round, "medium"));
        // Every pixel is close to the ink tint, whichever colour the card had.
        for (let i = 0; i < info.width * info.height; i += 97) {
            const offset = i * info.channels;
            expect(data[offset + 2]).toBeGreaterThan(data[offset + 1]);
        }
    });

    it("keeps no metadata of the source", async () => {
        const clue = await renderClue(card, round, "easy");
        expect((await sharp(clue).metadata()).exif).toBeUndefined();
    });

    it("stays inside the picture for any stored fragment", async () => {
        const clue = await renderClue(card, {crop: {x: 1, y: 1}, options: null}, "hard");
        expect((await sharp(clue).metadata()).width).toBe(480);
    });

    it("uses the sharper file only for the small fragment", () => {
        const images = {small: "small.png", large: "large.png"};
        expect(clueSourceUrl({images}, "easy")).toBe("small.png");
        expect(clueSourceUrl({images}, "medium")).toBe("small.png");
        expect(clueSourceUrl({images}, "hard")).toBe("large.png");
    });
});

describe("fetching card images", () => {
    it("returns the file", async () => {
        const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
        expect(await fetchCardImage("https://img/1.png", fetcher as unknown as typeof fetch)).toEqual(
            Buffer.from([1, 2, 3]),
        );
    });

    it("reports a failing image host as a clear error, without its details", async () => {
        const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
        const notFound = vi.fn(async () => new Response("", {status: 404}));
        await expect(fetchCardImage("https://img/1.png", notFound as unknown as typeof fetch)).rejects.toMatchObject({
            status: 502,
            code: "image_unavailable",
        });
        const offline = vi.fn(async () => {
            throw new Error("connect ECONNREFUSED");
        });
        await expect(fetchCardImage("https://img/1.png", offline as unknown as typeof fetch)).rejects.toMatchObject({
            status: 502,
            message: expect.not.stringContaining("ECONNREFUSED"),
        });
        quiet.mockRestore();
    });
});
