import {eq} from "drizzle-orm";
import {type NextRequest, NextRequest as Request_} from "next/server";
import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {POST as register} from "@/app/api/auth/register/route";
import {DELETE as removeFriend} from "@/app/api/friends/[userId]/route";
import {POST as acceptRequest} from "@/app/api/friends/requests/[id]/accept/route";
import {POST as rejectRequest} from "@/app/api/friends/requests/[id]/reject/route";
import {DELETE as cancelRequest} from "@/app/api/friends/requests/[id]/route";
import {POST as sendRequest} from "@/app/api/friends/requests/route";
import {GET as friends} from "@/app/api/friends/route";
import {POST as markRead} from "@/app/api/notifications/read/route";
import {GET as inbox} from "@/app/api/notifications/route";
import {GET as unread} from "@/app/api/notifications/unread/route";
import {GET as playerProfile} from "@/app/api/players/[userId]/route";
import {GET as search} from "@/app/api/players/search/route";
import {GET as profileChoices, PUT as updateProfile} from "@/app/api/profile/route";
import {POST as acceptTrade} from "@/app/api/trades/[id]/accept/route";
import {POST as cancelTrade} from "@/app/api/trades/[id]/cancel/route";
import {POST as rejectTrade} from "@/app/api/trades/[id]/reject/route";
import {GET as tradeOptions} from "@/app/api/trades/options/[friendId]/route";
import {GET as listTrades, POST as createTrade} from "@/app/api/trades/route";
import {SESSION_COOKIE} from "@/server/auth/token";
import {setDb} from "@/server/db/client";
import {cards, userCards} from "@/server/db/schema";
import {createTestDb, type TestDb} from "../helpers/db";

let t: TestDb;
let cardX: string;
let cardY: string;

beforeAll(async () => {
    t = await createTestDb();
    setDb(t.db);
    const [first, second] = await t.db.select({id: cards.id}).from(cards).limit(2);
    cardX = first.id;
    cardY = second.id;
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
            "x-forwarded-for": `10.2.0.${++counter}`,
            ...(options.body !== undefined ? {"content-type": "application/json"} : {}),
            ...(options.cookie ? {cookie: `${SESSION_COOKIE}=${options.cookie}`} : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
}

const params = <T>(value: T) => ({params: Promise.resolve(value)});
const none = undefined as unknown;
const SOME_ID = "00000000-0000-4000-8000-000000000000";

async function newPlayer() {
    const name = `social_api_${++counter}`;
    const res = await register(
        request("POST", "/api/auth/register", {
            body: {username: name, email: `${name}@example.com`, password: "password123"},
        }),
        none,
    );
    const account = await res.json();
    return {id: account.id as string, username: name, cookie: res.cookies.get(SESSION_COOKIE)!.value};
}

type Player = Awaited<ReturnType<typeof newPlayer>>;

async function befriend(a: Player, b: Player) {
    const sent = await sendRequest(
        request("POST", "/api/friends/requests", {cookie: a.cookie, body: {username: b.username}}),
        none,
    );
    expect(sent.status).toBe(201);
    const {id} = await sent.json();
    const accepted = await acceptRequest(
        request("POST", `/api/friends/requests/${id}/accept`, {cookie: b.cookie}),
        params({id: String(id)}),
    );
    expect(accepted.status).toBe(200);
}

describe("every social endpoint requires a session", () => {
    const anonymous = (method: string, path: string, body?: unknown) => request(method, path, {body});
    it.each([
        ["GET /api/notifications", () => inbox(anonymous("GET", "/api/notifications"), none)],
        ["GET /api/notifications/unread", () => unread(anonymous("GET", "/api/notifications/unread"), none)],
        ["POST /api/notifications/read", () => markRead(anonymous("POST", "/x", {upToId: 1}), none)],
        ["GET /api/friends", () => friends(anonymous("GET", "/api/friends"), none)],
        ["POST /api/friends/requests", () => sendRequest(anonymous("POST", "/x", {username: "abc"}), none)],
        ["POST accept request", () => acceptRequest(anonymous("POST", "/x"), params({id: "1"}))],
        ["POST reject request", () => rejectRequest(anonymous("POST", "/x"), params({id: "1"}))],
        ["DELETE request", () => cancelRequest(anonymous("DELETE", "/x"), params({id: "1"}))],
        ["DELETE friend", () => removeFriend(anonymous("DELETE", "/x"), params({userId: SOME_ID}))],
        ["GET search", () => search(anonymous("GET", "/api/players/search?q=ab"), none)],
        ["GET profile", () => playerProfile(anonymous("GET", "/x"), params({userId: SOME_ID}))],
        ["GET own choices", () => profileChoices(anonymous("GET", "/x"), none)],
        ["PUT profile", () => updateProfile(anonymous("PUT", "/x", {stats: ["trades"], showcase: []}), none)],
        ["GET trades", () => listTrades(anonymous("GET", "/x"), none)],
        ["POST trades", () => createTrade(anonymous("POST", "/x", {}), none)],
        ["GET trade options", () => tradeOptions(anonymous("GET", "/x"), params({friendId: SOME_ID}))],
        ["POST accept trade", () => acceptTrade(anonymous("POST", "/x"), params({id: "1"}))],
        ["POST reject trade", () => rejectTrade(anonymous("POST", "/x"), params({id: "1"}))],
        ["POST cancel trade", () => cancelTrade(anonymous("POST", "/x"), params({id: "1"}))],
    ])("%s", async (_, call) => {
        expect((await call()).status).toBe(401);
    });
});

describe("input validation", () => {
    let player: Player;

    beforeAll(async () => {
        player = await newPlayer();
    });

    it("rejects an invalid nick in an invitation", async () => {
        const res = await sendRequest(request("POST", "/x", {cookie: player.cookie, body: {username: "a b"}}), none);
        expect(res.status).toBe(400);
    });

    it.each(["abc", "0", "-1", "1.5", ""])("rejects %j as a record id", async (id) => {
        const res = await acceptTrade(request("POST", "/x", {cookie: player.cookie}), params({id}));
        expect(res.status).toBe(400);
    });

    it("rejects a player id that is not a uuid instead of failing in the database", async () => {
        const res = await playerProfile(request("GET", "/x", {cookie: player.cookie}), params({userId: "1' or 1=1"}));
        expect(res.status).toBe(400);
    });

    it.each(["", "a", "a%", "a b", "x".repeat(21)])("rejects %j as a search", async (query) => {
        const res = await search(
            request("GET", `/api/players/search?q=${encodeURIComponent(query)}`, {cookie: player.cookie}),
            none,
        );
        expect(res.status).toBe(400);
    });

    it.each([
        ["too many statistics", {stats: ["trades", "badges", "achievements", "days_in_game"], showcase: []}],
        ["no statistics", {stats: [], showcase: []}],
        ["repeated statistic", {stats: ["trades", "trades"], showcase: []}],
        ["unknown statistic", {stats: ["email"], showcase: []}],
        ["too many cards", {stats: ["trades"], showcase: ["a", "b", "c", "d", "e", "f"]}],
        ["repeated card", {stats: ["trades"], showcase: ["a", "a"]}],
    ])("rejects a profile with %s", async (_, body) => {
        const res = await updateProfile(request("PUT", "/x", {cookie: player.cookie, body}), none);
        expect(res.status).toBe(400);
    });

    it("rejects a trade without its cards", async () => {
        const res = await createTrade(request("POST", "/x", {cookie: player.cookie, body: {toUserId: SOME_ID}}), none);
        expect(res.status).toBe(400);
    });

    it("rejects a state change sent from another site", async () => {
        const req = new Request_("http://localhost/api/friends/requests", {
            method: "POST",
            headers: {
                host: "localhost",
                origin: "https://evil.example",
                "content-type": "application/json",
                cookie: `${SESSION_COOKIE}=${player.cookie}`,
            },
            body: JSON.stringify({username: "someone"}),
        });
        expect((await sendRequest(req, none)).status).toBe(403);
    });
});

describe("the whole social flow over the API", () => {
    it("goes from an invitation to a finished trade", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        await t.db.insert(userCards).values([
            {userId: a.id, cardId: cardX, quantity: 1},
            {userId: b.id, cardId: cardY, quantity: 1},
        ]);

        const found = await search(request("GET", `/api/players/search?q=${b.username}`, {cookie: a.cookie}), none);
        expect((await found.json()).map((player: {id: string}) => player.id)).toEqual([b.id]);

        await befriend(a, b);

        const options = await tradeOptions(request("GET", "/x", {cookie: a.cookie}), params({friendId: b.id}));
        const {mine, theirs} = await options.json();
        expect(mine.map((card: {id: string}) => card.id)).toEqual([cardX]);
        expect(theirs.map((card: {id: string}) => card.id)).toEqual([cardY]);

        const created = await createTrade(
            request("POST", "/x", {
                cookie: a.cookie,
                body: {toUserId: b.id, offeredCardId: cardX, requestedCardId: cardY},
            }),
            none,
        );
        expect(created.status).toBe(201);
        const {id} = await created.json();

        expect((await (await unread(request("GET", "/x", {cookie: b.cookie}), none)).json()).unread).toBe(2);
        const box = await (await inbox(request("GET", "/x", {cookie: b.cookie}), none)).json();
        expect(box.items[0]).toMatchObject({type: "trade_offer", trade: {id}});
        expect(JSON.stringify(box)).not.toContain("example.com");

        const read = await markRead(request("POST", "/x", {cookie: b.cookie, body: {upToId: box.items[0].id}}), none);
        expect((await read.json()).unread).toBe(0);

        const accepted = await acceptTrade(request("POST", "/x", {cookie: b.cookie}), params({id: String(id)}));
        expect(accepted.status).toBe(200);
        expect(await accepted.json()).toMatchObject({lostCard: false});

        const owned = await t.db.select().from(userCards).where(eq(userCards.userId, b.id));
        expect(owned.map((row) => row.cardId)).toEqual([cardX]);
    });

    it("does not reveal another player's trade or invitation", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        const stranger = await newPlayer();
        await t.db.insert(userCards).values([
            {userId: a.id, cardId: cardX, quantity: 1},
            {userId: b.id, cardId: cardY, quantity: 1},
        ]);
        await befriend(a, b);
        const created = await createTrade(
            request("POST", "/x", {
                cookie: a.cookie,
                body: {toUserId: b.id, offeredCardId: cardX, requestedCardId: cardY},
            }),
            none,
        );
        const {id} = await created.json();

        for (const action of [acceptTrade, rejectTrade, cancelTrade]) {
            const res = await action(request("POST", "/x", {cookie: stranger.cookie}), params({id: String(id)}));
            expect(res.status).toBe(404);
        }
        const options = await tradeOptions(request("GET", "/x", {cookie: stranger.cookie}), params({friendId: a.id}));
        expect(options.status).toBe(403);
    });

    it("serves a profile without the email", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        const res = await playerProfile(request("GET", "/x", {cookie: a.cookie}), params({userId: b.id}));
        expect(res.status).toBe(200);
        const body = await res.text();
        expect(body).toContain(b.username);
        expect(body).not.toContain("@example.com");
        expect(body).not.toContain("password");
    });
});
