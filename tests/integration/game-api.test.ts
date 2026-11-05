import {eq} from "drizzle-orm";
import {type NextRequest, NextRequest as Request_} from "next/server";
import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {POST as claimAchievement} from "@/app/api/achievements/[id]/claim/route";
import {GET as achievements} from "@/app/api/achievements/route";
import {POST as register} from "@/app/api/auth/register/route";
import {GET as owned} from "@/app/api/collection/owned/route";
import {GET as collectionSet} from "@/app/api/collection/[setId]/route";
import {GET as collection} from "@/app/api/collection/route";
import {POST as claimDaily} from "@/app/api/daily/claim/route";
import {POST as sendFeedback} from "@/app/api/feedback/route";
import {POST as openPack} from "@/app/api/packs/open/route";
import {POST as collectPiggy} from "@/app/api/piggy-bank/collect/route";
import {GET as player} from "@/app/api/player/route";
import {GET as shop} from "@/app/api/shop/route";
import {PUT as setSlot} from "@/app/api/slots/[slot]/route";
import {GET as statistics} from "@/app/api/statistics/route";
import {SESSION_COOKIE} from "@/server/auth/token";
import {setDb} from "@/server/db/client";
import {feedback, playerState, userCards} from "@/server/db/schema";
import {createTestDb, type TestDb} from "../helpers/db";

let t: TestDb;

beforeAll(async () => {
    t = await createTestDb();
    setDb(t.db);
});

afterAll(async () => {
    await t.close();
});

let counter = 0;

function request(method: string, path: string, options: {cookie?: string; body?: unknown} = {}): NextRequest {
    return new Request_(`http://localhost${path}`, {
        method,
        headers: {
            host: "localhost",
            "x-forwarded-for": `10.1.0.${++counter}`,
            ...(options.body !== undefined ? {"content-type": "application/json"} : {}),
            ...(options.cookie ? {cookie: `${SESSION_COOKIE}=${options.cookie}`} : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
}

const params = <T>(value: T) => ({params: Promise.resolve(value)});
const none = undefined as unknown;

async function newPlayer() {
    const name = `api_player_${++counter}`;
    const res = await register(
        request("POST", "/api/auth/register", {
            body: {username: name, email: `${name}@example.com`, password: "password123"},
        }),
        none,
    );
    const account = await res.json();
    return {id: account.id as string, cookie: res.cookies.get(SESSION_COOKIE)!.value};
}

describe("every game endpoint requires a session", () => {
    const anonymous = (method: string, path: string, body?: unknown) => request(method, path, {body});
    it.each([
        ["GET /api/player", () => player(anonymous("GET", "/api/player"), none)],
        ["GET /api/shop", () => shop(anonymous("GET", "/api/shop"), none)],
        ["GET /api/collection", () => collection(anonymous("GET", "/api/collection"), none)],
        ["GET /api/collection/owned", () => owned(anonymous("GET", "/api/collection/owned"), none)],
        [
            "GET /api/collection/sv1",
            () => collectionSet(anonymous("GET", "/api/collection/sv1"), params({setId: "sv1"})),
        ],
        ["GET /api/achievements", () => achievements(anonymous("GET", "/api/achievements"), none)],
        ["GET /api/statistics", () => statistics(anonymous("GET", "/api/statistics"), none)],
        ["POST /api/daily/claim", () => claimDaily(anonymous("POST", "/api/daily/claim"), none)],
        ["POST /api/piggy-bank/collect", () => collectPiggy(anonymous("POST", "/api/piggy-bank/collect"), none)],
        [
            "POST /api/packs/open",
            () => openPack(anonymous("POST", "/api/packs/open", {setId: "sv1", source: "shop"}), none),
        ],
        ["PUT /api/slots/1", () => setSlot(anonymous("PUT", "/api/slots/1", {cardId: null}), params({slot: "1"}))],
        [
            "POST /api/achievements/1/claim",
            () => claimAchievement(anonymous("POST", "/api/achievements/1/claim"), params({id: "1"})),
        ],
        ["POST /api/feedback", () => sendFeedback(anonymous("POST", "/api/feedback", {description: "x"}), none)],
    ])("%s", async (_, call) => {
        expect((await call()).status).toBe(401);
    });
});

describe("the client cannot dictate game results", () => {
    it("ignores a price and a card list sent by the client", async () => {
        const {id, cookie} = await newPlayer();
        const res = await openPack(
            request("POST", "/api/packs/open", {
                cookie,
                body: {setId: "sv1", source: "shop", price: -100000, cards: ["sv3pt5-1"], uid: "someone-else"},
            }),
            none,
        );
        expect(res.status).toBe(200);
        const [state] = await t.db.select().from(playerState).where(eq(playerState.userId, id));
        expect(state.coins).toBe(350);
        const rows = await t.db.select().from(userCards).where(eq(userCards.userId, id));
        expect(rows.every((row) => row.cardId.startsWith("sv1-"))).toBe(true);
    });

    it("acts only on the session's player, whatever uid is sent", async () => {
        const [first, second] = [await newPlayer(), await newPlayer()];
        const res = await claimDaily(
            request("POST", `/api/daily/claim?uid=${second.id}`, {cookie: first.cookie, body: {uid: second.id}}),
            none,
        );
        expect(res.status).toBe(200);
        const [state] = await t.db.select().from(playerState).where(eq(playerState.userId, second.id));
        expect(state.coins).toBe(500);
    });

    it("hides answers and other internals from pack results", async () => {
        const {cookie} = await newPlayer();
        const res = await openPack(
            request("POST", "/api/packs/open", {cookie, body: {setId: "sv1", source: "shop"}}),
            none,
        );
        const body = await res.json();
        expect(body.cards).toHaveLength(5);
        expect(body.cards[0]).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                isNew: expect.any(Boolean),
                overLimit: expect.any(Boolean),
            }),
        );
    });
});

describe("validation and errors", () => {
    it("rejects an invalid pack source", async () => {
        const {cookie} = await newPlayer();
        const res = await openPack(
            request("POST", "/api/packs/open", {cookie, body: {setId: "sv1", source: "free"}}),
            none,
        );
        expect(res.status).toBe(400);
    });

    it("rejects a slot other than 1 or 2", async () => {
        const {cookie} = await newPlayer();
        const res = await setSlot(request("PUT", "/api/slots/3", {cookie, body: {cardId: null}}), params({slot: "3"}));
        expect(res.status).toBe(404);
    });

    it("reports not enough coins with a readable message", async () => {
        const {id, cookie} = await newPlayer();
        await t.db.update(playerState).set({coins: 10}).where(eq(playerState.userId, id));
        const res = await openPack(
            request("POST", "/api/packs/open", {cookie, body: {setId: "sv1", source: "shop"}}),
            none,
        );
        expect(res.status).toBe(409);
        expect((await res.json()).error.message).toBe("Masz za mało monet");
    });

    it("does not expose database details on unexpected errors", async () => {
        const {cookie} = await newPlayer();
        const res = await collectionSet(request("GET", "/api/collection/nope", {cookie}), params({setId: "nope"}));
        expect(res.status).toBe(404);
        expect(JSON.stringify(await res.json())).not.toMatch(/select|game\.|sql/i);
    });
});

describe("POST /api/feedback", () => {
    it("reports success only after the message is stored", async () => {
        const {id, cookie} = await newPlayer();
        const res = await sendFeedback(
            request("POST", "/api/feedback", {cookie, body: {description: "  Znalazłem błąd  "}}),
            none,
        );
        expect(res.status).toBe(201);
        const rows = await t.db.select().from(feedback).where(eq(feedback.userId, id));
        expect(rows).toMatchObject([{description: "Znalazłem błąd"}]);
    });

    it("limits how many messages a player can send", async () => {
        const {id, cookie} = await newPlayer();
        const send = () =>
            sendFeedback(request("POST", "/api/feedback", {cookie, body: {description: "Pomysł"}}), none);
        for (let i = 0; i < 10; i++) expect((await send()).status).toBe(201);

        const res = await send();
        expect(res.status).toBe(429);
        expect((await res.json()).error.code).toBe("too_many_attempts");
        expect(await t.db.select().from(feedback).where(eq(feedback.userId, id))).toHaveLength(10);
    });

    it.each([
        ["empty", "   "],
        ["too long", "x".repeat(2001)],
    ])("rejects a message that is %s", async (_, description) => {
        const {cookie} = await newPlayer();
        const res = await sendFeedback(request("POST", "/api/feedback", {cookie, body: {description}}), none);
        expect(res.status).toBe(400);
    });
});
