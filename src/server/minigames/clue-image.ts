import sharp from "sharp";
import type {WhoIsItRound} from "@/domain/minigames/who-is-it";
import {AppError} from "@/server/http/errors";

/** The picture part of a card, below its name and above its rules, as fractions of the card. */
const ART = {left: 0.09, top: 0.12, width: 0.82, height: 0.36};
const OUTPUT_WIDTH = 480;
const FETCH_TIMEOUT_MS = 8_000;
const BLUR_SIGMA = 9;
const SHADOW_BLUR_SIGMA = 2.2;
/** Share of the art's width visible at the hard level. */
export const FRAGMENT_SIZE = 0.34;
/** Dark, middle and light ink, so only shapes remain. A true silhouette would need the background cut out. */
const SHADOW_INKS = [
    [28, 22, 66],
    [74, 62, 130],
    [176, 168, 214],
];

async function artOf(source: Buffer): Promise<Buffer> {
    const {width, height} = await sharp(source).metadata();
    return sharp(source)
        .extract({
            left: Math.round(ART.left * width),
            top: Math.round(ART.top * height),
            width: Math.round(ART.width * width),
            height: Math.round(ART.height * height),
        })
        .resize({width: OUTPUT_WIDTH})
        .removeAlpha()
        .toBuffer();
}

/** Grey levels split into three equally large bands, so each picture gets all three inks. */
async function shadowOf(art: Buffer): Promise<Buffer> {
    const {data, info} = await sharp(art).greyscale().blur(SHADOW_BLUR_SIGMA).raw().toBuffer({resolveWithObject: true});
    const pixels = info.width * info.height;
    const levels = Uint8Array.from({length: pixels}, (_, index) => data[index * info.channels]);
    const sorted = levels.slice().sort();
    const darkEnd = sorted[Math.floor(pixels / 3)];
    const middleEnd = sorted[Math.floor((pixels * 2) / 3)];

    const output = Buffer.alloc(pixels * 3);
    levels.forEach((level, index) => {
        output.set(SHADOW_INKS[level <= darkEnd ? 0 : level <= middleEnd ? 1 : 2], index * 3);
    });
    return sharp(output, {raw: {width: info.width, height: info.height, channels: 3}})
        .png()
        .toBuffer();
}

async function fragmentOf(art: Buffer, crop: {x: number; y: number}): Promise<Buffer> {
    const {width, height} = await sharp(art).metadata();
    const size = Math.round(width * FRAGMENT_SIZE);
    return sharp(art)
        .extract({
            left: Math.min(Math.round(crop.x * width), width - size),
            top: Math.min(Math.round(crop.y * height), height - size),
            width: size,
            height: size,
        })
        .resize({width: OUTPUT_WIDTH})
        .toBuffer();
}

/**
 * Makes the picture on the server, so the client never receives the original or its address, either of
 * which would name the card. Image metadata is not carried over.
 */
export async function renderClue(source: Buffer, round: Pick<WhoIsItRound, "crop" | "options">, difficulty: string) {
    const art = await artOf(source);
    const clue =
        difficulty === "easy"
            ? await sharp(art).blur(BLUR_SIGMA).toBuffer()
            : difficulty === "medium"
              ? await shadowOf(art)
              : await fragmentOf(art, round.crop ?? {x: 0.33, y: 0.2});
    return sharp(clue).webp({quality: 80}).toBuffer();
}

export function clueSourceUrl(round: Pick<WhoIsItRound, "images">, difficulty: string): string {
    // A small fragment needs the sharper file; the other levels hide the detail anyway.
    return difficulty === "hard" ? round.images.large : round.images.small;
}

export async function fetchCardImage(url: string, fetcher: typeof fetch = fetch): Promise<Buffer> {
    try {
        const response = await fetcher(url, {signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)});
        if (!response.ok) throw new Error(`Image host answered ${response.status}`);
        return Buffer.from(await response.arrayBuffer());
    } catch (error) {
        console.error(error);
        throw new AppError(502, "image_unavailable", "Nie udało się wczytać obrazka. Spróbuj ponownie");
    }
}
