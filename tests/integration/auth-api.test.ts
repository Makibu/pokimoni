import {eq} from "drizzle-orm";
import {SignJWT} from "jose";
import {NextRequest} from "next/server";
import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {POST as login} from "@/app/api/auth/login/route";
import {POST as logout} from "@/app/api/auth/logout/route";
import {DELETE as deleteMe, GET as me, PATCH as patchMe} from "@/app/api/auth/me/route";
import {POST as register} from "@/app/api/auth/register/route";
import {SESSION_COOKIE} from "@/server/auth/token";
import {setDb} from "@/server/db/client";
import {coinLedger, playerState, trades, users} from "@/server/db/schema";
import {createTestDb, type TestDb} from "../helpers/db";

let t: TestDb;

beforeAll(async () => {
    t = await createTestDb({seed: false});
    setDb(t.db);
});

afterAll(async () => {
    await t.close();
});

let counter = 0;
const uniqueIp = () => `10.0.0.${++counter}`;
const PASSWORD = "dowolne haslo 8+";

function request(
    method: string,
    path: string,
    options: {body?: unknown; cookie?: string; headers?: Record<string, string>} = {},
) {
    return new NextRequest(`http://localhost${path}`, {
        method,
        headers: {
            host: "localhost",
            "x-forwarded-for": uniqueIp(),
            ...(options.body !== undefined ? {"content-type": "application/json"} : {}),
            ...(options.cookie ? {cookie: `${SESSION_COOKIE}=${options.cookie}`} : {}),
            ...options.headers,
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
}

const noContext = undefined as unknown;

async function registerPlayer(name = `player_${++counter}`) {
    const res = await register(
        request("POST", "/api/auth/register", {
            body: {username: name, email: `${name}@example.com`, password: PASSWORD},
        }),
        noContext,
    );
    expect(res.status).toBe(201);
    const account = await res.json();
    return {account, name, email: `${name}@example.com`, cookie: res.cookies.get(SESSION_COOKIE)!.value};
}

describe("POST /api/auth/register", () => {
    it("creates the account with starting coins and an HttpOnly session cookie", async () => {
        const res = await register(
            request("POST", "/api/auth/register", {
                body: {username: "Ash_K", email: "ash@example.com", password: PASSWORD},
            }),
            noContext,
        );
        expect(res.status).toBe(201);

        const body = await res.json();
        expect(body).toMatchObject({username: "Ash_K", email: "ash@example.com"});
        expect(JSON.stringify(body)).not.toContain("password");

        const cookie = res.cookies.get(SESSION_COOKIE)!;
        expect(cookie.httpOnly).toBe(true);
        expect(cookie.sameSite).toBe("lax");

        const [state] = await t.db.select().from(playerState).where(eq(playerState.userId, body.id));
        expect(state.coins).toBe(500);
        const ledger = await t.db.select().from(coinLedger).where(eq(coinLedger.userId, body.id));
        expect(ledger).toMatchObject([{amount: 500, reason: "starting_bonus"}]);
    });

    it("rejects a nick differing only by letter case", async () => {
        await registerPlayer("Misty_W");
        const res = await register(
            request("POST", "/api/auth/register", {
                body: {username: "MISTY_w", email: "other@example.com", password: PASSWORD},
            }),
            noContext,
        );
        expect(res.status).toBe(409);
        expect((await res.json()).error.code).toBe("username_taken");
    });

    it("rejects an email differing only by letter case", async () => {
        await registerPlayer("Brock_S");
        const res = await register(
            request("POST", "/api/auth/register", {
                body: {username: "Brock_Two", email: "BROCK_S@example.com", password: PASSWORD},
            }),
            noContext,
        );
        expect(res.status).toBe(409);
        expect((await res.json()).error.code).toBe("email_taken");
    });

    it.each([
        ["short password", {username: "valid_nick", email: "a@example.com", password: "1234567"}],
        ["invalid nick", {username: "no spaces!", email: "a@example.com", password: PASSWORD}],
        ["invalid email", {username: "valid_nick", email: "nope", password: PASSWORD}],
    ])("validates input: %s", async (_, body) => {
        const res = await register(request("POST", "/api/auth/register", {body}), noContext);
        expect(res.status).toBe(400);
    });

    it("accepts any 8-character password", async () => {
        const res = await register(
            request("POST", "/api/auth/register", {
                body: {username: "simple_pw", email: "simple@example.com", password: "abcdefgh"},
            }),
            noContext,
        );
        expect(res.status).toBe(201);
    });

    it("limits registrations per IP", async () => {
        const headers = {"x-forwarded-for": "203.0.113.7"};
        for (let i = 0; i < 10; i++) {
            await register(
                request("POST", "/api/auth/register", {
                    body: {username: `flood_${i}`, email: `f${i}@example.com`, password: PASSWORD},
                    headers,
                }),
                noContext,
            );
        }
        const res = await register(
            request("POST", "/api/auth/register", {
                body: {username: "flood_x", email: "fx@example.com", password: PASSWORD},
                headers,
            }),
            noContext,
        );
        expect(res.status).toBe(429);
    });

    it("rejects requests from another site", async () => {
        const res = await register(
            request("POST", "/api/auth/register", {
                body: {username: "csrf_user", email: "csrf@example.com", password: PASSWORD},
                headers: {origin: "https://evil.example"},
            }),
            noContext,
        );
        expect(res.status).toBe(403);
    });

    it("rejects non-JSON requests", async () => {
        const res = await register(
            new NextRequest("http://localhost/api/auth/register", {
                method: "POST",
                headers: {host: "localhost", "content-type": "text/plain"},
                body: "x",
            }),
            noContext,
        );
        expect(res.status).toBe(415);
    });
});

describe("POST /api/auth/login", () => {
    it("signs in with a case-insensitive email", async () => {
        const player = await registerPlayer();
        const res = await login(
            request("POST", "/api/auth/login", {body: {email: player.email.toUpperCase(), password: PASSWORD}}),
            noContext,
        );
        expect(res.status).toBe(200);
        expect(res.cookies.get(SESSION_COOKIE)?.value).toBeTruthy();
    });

    it("gives the same answer for a wrong password and an unknown email", async () => {
        const player = await registerPlayer();
        const wrong = await login(
            request("POST", "/api/auth/login", {body: {email: player.email, password: "wrong-password"}}),
            noContext,
        );
        const unknown = await login(
            request("POST", "/api/auth/login", {body: {email: "nobody@example.com", password: "wrong-password"}}),
            noContext,
        );
        expect(wrong.status).toBe(401);
        expect(unknown.status).toBe(401);
        expect(await wrong.json()).toEqual(await unknown.json());
    });

    it("locks an email after 10 failed attempts, even with the correct password", async () => {
        const player = await registerPlayer();
        for (let i = 0; i < 10; i++) {
            await login(
                request("POST", "/api/auth/login", {body: {email: player.email, password: "bad-password"}}),
                noContext,
            );
        }
        const res = await login(
            request("POST", "/api/auth/login", {body: {email: player.email, password: PASSWORD}}),
            noContext,
        );
        expect(res.status).toBe(429);
    });
});

describe("session handling", () => {
    it("rejects requests without a session", async () => {
        const res = await me(request("GET", "/api/auth/me"), noContext);
        expect(res.status).toBe(401);
    });

    it("rejects a malformed token", async () => {
        const res = await me(request("GET", "/api/auth/me", {cookie: "not-a-token"}), noContext);
        expect(res.status).toBe(401);
    });

    it("rejects a token signed with another secret", async () => {
        const {account} = await registerPlayer();
        const forged = await new SignJWT({ver: 0})
            .setProtectedHeader({alg: "HS256"})
            .setSubject(account.id)
            .setExpirationTime("1h")
            .sign(new TextEncoder().encode("attacker-secret-attacker-secret-attacker"));
        const res = await me(request("GET", "/api/auth/me", {cookie: forged}), noContext);
        expect(res.status).toBe(401);
    });

    it("returns only the signed-in player, ignoring any uid in the URL", async () => {
        const [first, second] = [await registerPlayer(), await registerPlayer()];
        const res = await me(
            request("GET", `/api/auth/me?uid=${second.account.id}`, {cookie: first.cookie}),
            noContext,
        );
        expect((await res.json()).id).toBe(first.account.id);
    });

    it("clears the cookie on logout", async () => {
        const res = await logout(request("POST", "/api/auth/logout"), noContext);
        const cookie = res.cookies.get(SESSION_COOKIE)!;
        expect(cookie.value).toBe("");
        expect(cookie.maxAge).toBe(0);
    });
});

describe("PATCH /api/auth/me", () => {
    it("changes nick and avatar without a password", async () => {
        const player = await registerPlayer();
        const res = await patchMe(
            request("PATCH", "/api/auth/me", {cookie: player.cookie, body: {username: `new_${counter}`, avatar: 3}}),
            noContext,
        );
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({avatar: 3});
    });

    it("requires the current password to change the email", async () => {
        const player = await registerPlayer();
        const newEmail = {email: `changed_${counter}@example.com`};

        const missing = await patchMe(
            request("PATCH", "/api/auth/me", {cookie: player.cookie, body: newEmail}),
            noContext,
        );
        expect(missing.status).toBe(400);

        const wrong = await patchMe(
            request("PATCH", "/api/auth/me", {cookie: player.cookie, body: {...newEmail, currentPassword: "wrong"}}),
            noContext,
        );
        expect(wrong.status).toBe(403);

        const ok = await patchMe(
            request("PATCH", "/api/auth/me", {cookie: player.cookie, body: {...newEmail, currentPassword: PASSWORD}}),
            noContext,
        );
        expect(ok.status).toBe(200);
    });

    it("does not ask for a password when the same email is resent", async () => {
        const player = await registerPlayer();
        const res = await patchMe(
            request("PATCH", "/api/auth/me", {cookie: player.cookie, body: {email: player.email.toUpperCase()}}),
            noContext,
        );
        expect(res.status).toBe(200);
    });

    it("invalidates other sessions after a password change and keeps this one", async () => {
        const player = await registerPlayer();
        const res = await patchMe(
            request("PATCH", "/api/auth/me", {
                cookie: player.cookie,
                body: {newPassword: "brand-new-password", currentPassword: PASSWORD},
            }),
            noContext,
        );
        expect(res.status).toBe(200);

        const oldSession = await me(request("GET", "/api/auth/me", {cookie: player.cookie}), noContext);
        expect(oldSession.status).toBe(401);

        const newSession = await me(
            request("GET", "/api/auth/me", {cookie: res.cookies.get(SESSION_COOKIE)!.value}),
            noContext,
        );
        expect(newSession.status).toBe(200);

        const relogin = await login(
            request("POST", "/api/auth/login", {body: {email: player.email, password: "brand-new-password"}}),
            noContext,
        );
        expect(relogin.status).toBe(200);
    });

    it("rejects a nick taken by someone else", async () => {
        const [first, second] = [await registerPlayer(), await registerPlayer()];
        const res = await patchMe(
            request("PATCH", "/api/auth/me", {cookie: first.cookie, body: {username: second.name.toUpperCase()}}),
            noContext,
        );
        expect(res.status).toBe(409);
    });
});

describe("DELETE /api/auth/me", () => {
    it("requires the correct password", async () => {
        const player = await registerPlayer();
        const res = await deleteMe(
            request("DELETE", "/api/auth/me", {cookie: player.cookie, body: {password: "wrong"}}),
            noContext,
        );
        expect(res.status).toBe(403);
        const [still] = await t.db.select().from(users).where(eq(users.id, player.account.id));
        expect(still).toBeDefined();
    });

    it("removes the account and all related data", async () => {
        const [player, friend] = [await registerPlayer(), await registerPlayer()];
        const res = await deleteMe(
            request("DELETE", "/api/auth/me", {cookie: player.cookie, body: {password: PASSWORD}}),
            noContext,
        );
        expect(res.status).toBe(200);
        expect(res.cookies.get(SESSION_COOKIE)!.value).toBe("");

        expect(await t.db.select().from(users).where(eq(users.id, player.account.id))).toEqual([]);
        expect(await t.db.select().from(playerState).where(eq(playerState.userId, player.account.id))).toEqual([]);
        expect(await t.db.select().from(trades).where(eq(trades.toUserId, player.account.id))).toEqual([]);

        const afterwards = await me(request("GET", "/api/auth/me", {cookie: player.cookie}), noContext);
        expect(afterwards.status).toBe(401);

        const friendStillIn = await me(request("GET", "/api/auth/me", {cookie: friend.cookie}), noContext);
        expect(friendStillIn.status).toBe(200);
    });
});
