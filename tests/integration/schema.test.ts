import {count, eq} from "drizzle-orm";
import type {PgTable} from "drizzle-orm/pg-core";
import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {
    achievements,
    badges,
    cards,
    friendRequests,
    friendships,
    playerState,
    sets,
    trades,
    userCards,
    users,
} from "@/server/db/schema";
import {seedCatalog} from "@/server/db/seed";
import {createTestDb, type TestDb} from "../helpers/db";

let t: TestDb;

beforeAll(async () => {
    t = await createTestDb();
});

afterAll(async () => {
    await t.close();
});

let userCounter = 0;
async function createUser(username = `player_${++userCounter}`) {
    const [user] = await t.db
        .insert(users)
        .values({username, email: `${username}@example.com`, passwordHash: "x"})
        .returning();
    await t.db.insert(playerState).values({userId: user.id, coins: 500});
    return user;
}

/** Postgres error raised by a rejected statement (Drizzle wraps it in `cause`). */
async function dbError(promise: Promise<unknown>): Promise<string> {
    try {
        await promise;
    } catch (error) {
        const cause = (error as {cause?: {message?: string}}).cause;
        return cause?.message ?? String(error);
    }
    throw new Error("Expected the statement to fail");
}

describe("catalog seed", () => {
    it("loads the full catalog", async () => {
        const total = async (table: PgTable) => (await t.db.select({n: count()}).from(table))[0].n;
        expect(await total(sets)).toBe(15);
        expect(await total(cards)).toBe(3169);
        expect(await total(achievements)).toBe(34);
        expect(await total(badges)).toBe(9);
    });

    it("assigns five sets to each tier", async () => {
        const rows = await t.db.select({tier: sets.tier, n: count()}).from(sets).groupBy(sets.tier).orderBy(sets.tier);
        expect(rows).toEqual([
            {tier: 1, n: 5},
            {tier: 2, n: 5},
            {tier: 3, n: 5},
        ]);
    });

    it("converts large achievement rewards to pack vouchers", async () => {
        const [big] = await t.db.select().from(achievements).where(eq(achievements.id, 7));
        expect(big.rewardCoins).toBeNull();
        expect(big.rewardPackTier).toBe(3);
        const [small] = await t.db.select().from(achievements).where(eq(achievements.id, 1));
        expect(small.rewardCoins).toBe(50);
    });

    it("can be run again without duplicating rows", async () => {
        await seedCatalog(t.db);
        expect((await t.db.select({n: count()}).from(cards))[0].n).toBe(3169);
    });
});

describe("constraints", () => {
    it("enables row level security on every table", async () => {
        const result = await t.client.query<{relname: string}>(
            `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'game' and c.relkind = 'r' and not c.relrowsecurity`,
        );
        expect(result.rows).toEqual([]);
    });

    it("treats usernames case-insensitively but keeps the display form", async () => {
        const ash = await createUser("Ash_Ketchum");
        expect(ash.username).toBe("Ash_Ketchum");
        expect(ash.usernameKey).toBe("ash_ketchum");
        expect(await dbError(createUser("ASH_KETCHUM"))).toMatch(/users_username_key_idx/);
    });

    it("rejects invalid usernames", async () => {
        expect(await dbError(createUser("a b"))).toMatch(/users_username_format/);
        expect(await dbError(createUser("ab"))).toMatch(/users_username_format/);
    });

    it("never lets the coin balance go negative", async () => {
        const user = await createUser();
        expect(await dbError(t.db.update(playerState).set({coins: -1}).where(eq(playerState.userId, user.id)))).toMatch(
            /player_state_coins_non_negative/,
        );
    });

    it("limits a card to 9 copies", async () => {
        const user = await createUser();
        expect(await dbError(t.db.insert(userCards).values({userId: user.id, cardId: "sv1-1", quantity: 10}))).toMatch(
            /user_cards_quantity_range/,
        );
    });

    it("only allows owned cards in income slots", async () => {
        const user = await createUser();
        expect(
            await dbError(t.db.update(playerState).set({slot1CardId: "sv1-1"}).where(eq(playerState.userId, user.id))),
        ).toMatch(/player_state_slot_1_owned_fk/);

        await t.db.insert(userCards).values({userId: user.id, cardId: "sv1-1", quantity: 1});
        await t.db.update(playerState).set({slot1CardId: "sv1-1"}).where(eq(playerState.userId, user.id));
    });

    it("allows one pending trade per direction", async () => {
        const [a, b] = [await createUser(), await createUser()];
        const offer = {fromUserId: a.id, toUserId: b.id, offeredCardId: "sv1-1", requestedCardId: "sv1-2"};
        const [first] = await t.db.insert(trades).values(offer).returning();

        expect(await dbError(t.db.insert(trades).values(offer))).toMatch(/trades_one_pending_per_direction/);
        await t.db.insert(trades).values({...offer, fromUserId: b.id, toUserId: a.id});

        await t.db.update(trades).set({status: "cancelled"}).where(eq(trades.id, first.id));
        await t.db.insert(trades).values(offer);
    });

    it("allows one pending friend request per pair, in either direction", async () => {
        const [a, b] = [await createUser(), await createUser()];
        await t.db.insert(friendRequests).values({fromUserId: a.id, toUserId: b.id});
        expect(await dbError(t.db.insert(friendRequests).values({fromUserId: b.id, toUserId: a.id}))).toMatch(
            /friend_requests_one_pending_per_pair/,
        );
    });

    it("removes all player data when the account is deleted", async () => {
        const [a, b] = [await createUser(), await createUser()];
        await t.db.insert(userCards).values({userId: a.id, cardId: "sv1-3", quantity: 2});
        await t.db.update(playerState).set({slot1CardId: "sv1-3"}).where(eq(playerState.userId, a.id));
        const [first, second] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
        await t.db.insert(friendships).values({userA: first, userB: second});
        await t.db
            .insert(trades)
            .values({fromUserId: a.id, toUserId: b.id, offeredCardId: "sv1-3", requestedCardId: "sv1-4"});

        await t.db.delete(users).where(eq(users.id, a.id));

        const leftovers = await t.client.query<{n: number}>(
            `
            select (select count(*) from game.user_cards where user_id = $1)
                 + (select count(*) from game.player_state where user_id = $1)
                 + (select count(*) from game.friendships where user_a = $1 or user_b = $1)
                 + (select count(*) from game.trades where from_user_id = $1 or to_user_id = $1) as n`,
            [a.id],
        );
        expect(Number(leftovers.rows[0].n)).toBe(0);
    });
});
