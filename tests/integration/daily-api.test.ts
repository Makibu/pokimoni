import {like} from "drizzle-orm";
import {type NextRequest, NextRequest as Request_} from "next/server";
import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import sharp from "sharp";
import {POST as register} from "@/app/api/auth/register/route";
import {POST as action} from "@/app/api/minigame/action/route";
import {GET as picture} from "@/app/api/minigame/picture/route";
import {GET as minigame} from "@/app/api/minigame/route";
import {POST as start} from "@/app/api/minigame/start/route";
import {POST as claim} from "@/app/api/quests/[slot]/claim/route";
import {GET as quests} from "@/app/api/quests/route";
import {gameDayOf} from "@/domain/game-day";
import {LIMITS} from "@/server/auth/rate-limit";
import {SESSION_COOKIE} from "@/server/auth/token";
import {setDb} from "@/server/db/client";
import {authAttempts, minigameDays} from "@/server/db/schema";
import {createTestDb, type TestDb} from "../helpers/db";

let t: TestDb;

beforeAll(async () => {
    t = await createTestDb();
    setDb(t.db);
    // The picture needs this game; the rest of the tests work with any.
    await t.db
        .insert(minigameDays)
        .values({gameDay: gameDayOf(new Date()), game: "who_is_it", difficulty: "easy", payload: {}});
});

afterAll(async () => {
    await t.close();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

let counter = 0;
const none = undefined as unknown;
const params = <T>(value: T) => ({params: Promise.resolve(value)});

function request(method: string, options: {cookie?: string; body?: unknown; origin?: string} = {}): NextRequest {
    return new Request_("http://localhost/x", {
        method,
        headers: {
            host: "localhost",
            "x-forwarded-for": `10.3.0.${++counter}`,
            ...(options.origin ? {origin: options.origin} : {}),
            ...(options.body !== undefined ? {"content-type": "application/json"} : {}),
            ...(options.cookie ? {cookie: `${SESSION_COOKIE}=${options.cookie}`} : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
}

async function newCookie() {
    const name = `daily_api_${++counter}`;
    const res = await register(
        request("POST", {body: {username: name, email: `${name}@example.com`, password: "password123"}}),
        none,
    );
    return res.cookies.get(SESSION_COOKIE)!.value;
}

async function fakeCard() {
    return sharp({create: {width: 245, height: 342, channels: 3, background: "#3366cc"}})
        .png()
        .toBuffer();
}

describe("every daily endpoint requires a session", () => {
    it.each([
        ["GET /api/quests", () => quests(request("GET"), none)],
        ["POST claim", () => claim(request("POST"), params({slot: "1"}))],
        ["GET /api/minigame", () => minigame(request("GET"), none)],
        ["POST start", () => start(request("POST"), none)],
        ["POST action", () => action(request("POST", {body: {type: "flip", position: 0}}), none)],
        ["GET picture", () => picture(request("GET"), none)],
    ])("%s", async (_, call) => {
        expect((await call()).status).toBe(401);
    });
});

describe("input validation", () => {
    let cookie: string;

    beforeAll(async () => {
        cookie = await newCookie();
    });

    it.each([
        ["no type", {}],
        ["an unknown type", {type: "win"}],
        ["an empty answer", {type: "answer", answer: "   "}],
        ["a very long answer", {type: "answer", answer: "x".repeat(61)}],
        ["a position as text", {type: "flip", position: "1"}],
        ["a fractional position", {type: "flip", position: 1.5}],
        ["a negative position", {type: "flip", position: -1}],
        ["a position off every table", {type: "flip", position: 26}],
        ["no moves", {type: "moves", cells: []}],
        ["too many moves", {type: "moves", cells: Array.from({length: 201}, () => 0)}],
    ])("rejects %s", async (_, body) => {
        expect((await action(request("POST", {cookie, body}), none)).status).toBe(400);
    });

    it.each(["0", "4", "abc", "1.5"])("rejects quest slot %s", async (slot) => {
        expect((await claim(request("POST", {cookie}), params({slot}))).status).toBe(400);
    });

    it("rejects a move sent from another site", async () => {
        const res = await action(
            request("POST", {cookie, origin: "https://evil.example", body: {type: "flip", position: 0}}),
            none,
        );
        expect(res.status).toBe(403);
    });

    it("rejects claiming a quest sent from another site", async () => {
        const res = await claim(request("POST", {cookie, origin: "https://evil.example"}), params({slot: "1"}));
        expect(res.status).toBe(403);
    });
});

describe("a game day through the API", () => {
    it("lists quests that cannot be claimed yet", async () => {
        const cookie = await newCookie();
        const res = await quests(request("GET", {cookie}), none);
        expect(res.status).toBe(200);
        const list = await res.json();
        expect(list).toHaveLength(3);
        expect(JSON.stringify(list)).not.toContain("userId");

        const claimed = await claim(request("POST", {cookie}), params({slot: "1"}));
        expect(claimed.status).toBe(409);
    });

    it("starts and plays the game", async () => {
        const cookie = await newCookie();
        const before = await (await minigame(request("GET", {cookie}), none)).json();
        expect(before.status).toBe("not_started");

        const started = await (await start(request("POST", {cookie}), none)).json();
        expect(started.status).toBe("in_progress");
        expect(started.view.round).toBe(1);

        const answered = await action(
            request("POST", {cookie, body: {type: "answer", answer: started.view.options[0]}}),
            none,
        );
        expect(answered.status).toBe(200);
        expect((await answered.json()).view.round).toBe(2);
    });

    it("answers 409 to a move before the start", async () => {
        const cookie = await newCookie();
        const res = await action(request("POST", {cookie, body: {type: "answer", answer: "x"}}), none);
        expect(res.status).toBe(409);
    });
});

describe("the clue picture", () => {
    it("is 404 before the game starts", async () => {
        const cookie = await newCookie();
        expect((await picture(request("GET", {cookie}), none)).status).toBe(404);
    });

    it("comes as WebP, never cached, without the card's address", async () => {
        const cookie = await newCookie();
        await start(request("POST", {cookie}), none);
        const card = await fakeCard();
        const fetcher = vi.fn(async () => new Response(new Uint8Array(card)));
        vi.stubGlobal("fetch", fetcher);

        const res = await picture(request("GET", {cookie}), none);
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toBe("image/webp");
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(res.headers.get("location")).toBeNull();
        expect(fetcher).toHaveBeenCalledTimes(1);

        const body = Buffer.from(await res.arrayBuffer());
        expect((await sharp(body).metadata()).format).toBe("webp");
        expect(body.toString("latin1")).not.toContain("pokemontcg");
    });

    it("answers 502 with a clear message when the image host is down", async () => {
        const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
        const cookie = await newCookie();
        await start(request("POST", {cookie}), none);
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response("", {status: 503})),
        );

        const res = await picture(request("GET", {cookie}), none);
        expect(res.status).toBe(502);
        expect((await res.json()).error.code).toBe("image_unavailable");
        quiet.mockRestore();
    });

    it("answers 429 without touching the image host once the limit is reached", async () => {
        const cookie = await newCookie();
        await start(request("POST", {cookie}), none);
        const fetcher = vi.fn(async () => new Response(new Uint8Array(await fakeCard())));
        vi.stubGlobal("fetch", fetcher);
        expect((await picture(request("GET", {cookie}), none)).status).toBe(200);
        fetcher.mockClear();

        await t.db
            .update(authAttempts)
            .set({count: LIMITS.cluePicturesPerUser})
            .where(like(authAttempts.key, "clue-picture:user:%"));

        const res = await picture(request("GET", {cookie}), none);
        expect(res.status).toBe(429);
        expect((await res.json()).error.code).toBe("too_many_attempts");
        expect(fetcher).not.toHaveBeenCalled();
    });
});
