import {and, eq} from "drizzle-orm";
import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {PROFILE_STATS} from "@/domain/profile";
import {hashPassword} from "@/server/auth/password";
import {
    achievements,
    cards,
    friendships,
    notifications,
    packOpenings,
    playerState,
    profileStats,
    sets,
    showcase,
    trades,
    userAchievements,
    userCards,
    users,
} from "@/server/db/schema";
import {deleteAccount} from "@/server/services/account";
import {getSetCollection, listOwnedCards} from "@/server/services/collection";
import {
    acceptFriendRequest,
    areFriends,
    cancelFriendRequest,
    listFriends,
    rejectFriendRequest,
    removeFriend,
    sendFriendRequest,
} from "@/server/services/friends";
import {countUnread, getInbox, markNotificationsRead} from "@/server/services/notifications";
import {searchPlayers} from "@/server/services/players";
import {getProfile, getProfileChoices, updateProfile} from "@/server/services/profile";
import {
    acceptTrade,
    cancelTrade,
    createTrade,
    getTradeOptions,
    listTrades,
    rejectTrade,
} from "@/server/services/trades";
import {setIncomeSlot} from "@/server/services/wallet";
import {createTestDb, type TestDb} from "../helpers/db";

let t: TestDb;
let cardX: string;
let cardY: string;
let cardZ: string;

beforeAll(async () => {
    t = await createTestDb();
    const [first, second, third] = await t.db.select({id: cards.id}).from(cards).limit(3);
    cardX = first.id;
    cardY = second.id;
    cardZ = third.id;
});

afterAll(async () => {
    await t.close();
});

let counter = 0;

async function newPlayer(prefix = "social") {
    const name = `${prefix}_${++counter}`;
    const [user] = await t.db
        .insert(users)
        .values({username: name, email: `${name}@example.com`, passwordHash: "x"})
        .returning();
    await t.db.insert(playerState).values({userId: user.id, coins: 500});
    return {id: user.id, username: name};
}

async function give(userId: string, cardId: string, quantity = 1) {
    await t.db
        .insert(userCards)
        .values({userId, cardId, quantity})
        .onConflictDoUpdate({target: [userCards.userId, userCards.cardId], set: {quantity}});
}

async function copies(userId: string, cardId: string) {
    const [row] = await t.db
        .select({quantity: userCards.quantity})
        .from(userCards)
        .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)));
    return row?.quantity ?? 0;
}

async function befriend(a: {id: string}, b: {id: string; username: string}) {
    const {id} = await sendFriendRequest(t.db, a.id, b.username);
    await acceptFriendRequest(t.db, b.id, id);
}

async function friendsWithCards() {
    const a = await newPlayer();
    const b = await newPlayer();
    await befriend(a, b);
    await give(a.id, cardX);
    await give(b.id, cardY);
    return {a, b};
}

const offerXforY = (from: {id: string}, to: {id: string}) =>
    createTrade(t.db, from.id, {toUserId: to.id, offeredCardId: cardX, requestedCardId: cardY});

async function typesOf(userId: string) {
    return (await getInbox(t.db, userId)).items.map((item) => item.type);
}

async function statusOf(tradeId: number) {
    const [row] = await t.db.select({status: trades.status}).from(trades).where(eq(trades.id, tradeId));
    return row.status;
}

const rejectsWith = (promise: Promise<unknown>, status: number, code: string) =>
    expect(promise).rejects.toMatchObject({status, code});

describe("friend invitations", () => {
    it("goes from an invitation by nick to a friendship on both sides", async () => {
        const a = await newPlayer();
        const b = await newPlayer();

        const {id} = await sendFriendRequest(t.db, a.id, b.username.toUpperCase());

        const inbox = await getInbox(t.db, b.id);
        expect(inbox.unread).toBe(1);
        expect(inbox.items[0]).toMatchObject({
            type: "friend_request",
            actor: {id: a.id, username: a.username},
            friendRequest: {id, pending: true},
        });
        expect((await listFriends(t.db, b.id)).incoming[0]).toMatchObject({id, player: {id: a.id}});
        expect((await listFriends(t.db, a.id)).outgoing[0]).toMatchObject({id, player: {id: b.id}});

        await acceptFriendRequest(t.db, b.id, id);

        expect(await areFriends(t.db, a.id, b.id)).toBe(true);
        expect((await listFriends(t.db, a.id)).friends.map((friend) => friend.id)).toEqual([b.id]);
        expect((await listFriends(t.db, b.id)).friends.map((friend) => friend.id)).toEqual([a.id]);
        expect((await listFriends(t.db, b.id)).incoming).toEqual([]);
        expect(await typesOf(a.id)).toEqual(["friend_accepted"]);
        expect((await getInbox(t.db, b.id)).items[0].friendRequest).toEqual({id, pending: false});
    });

    it("rejects inviting yourself, whatever the case of the nick", async () => {
        const a = await newPlayer();
        await rejectsWith(sendFriendRequest(t.db, a.id, a.username.toUpperCase()), 400, "self_request");
    });

    it("rejects an unknown nick", async () => {
        const a = await newPlayer();
        await rejectsWith(sendFriendRequest(t.db, a.id, "nobody_here"), 404, "player_not_found");
    });

    it("rejects a duplicate invitation", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        await sendFriendRequest(t.db, a.id, b.username);
        await rejectsWith(sendFriendRequest(t.db, a.id, b.username), 409, "request_exists");
    });

    it("points to the invitation already received instead of sending a second one", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        await sendFriendRequest(t.db, a.id, b.username);
        await rejectsWith(sendFriendRequest(t.db, b.id, a.username), 409, "request_received");
    });

    it("rejects inviting a friend", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        await befriend(a, b);
        await rejectsWith(sendFriendRequest(t.db, a.id, b.username), 409, "already_friends");
        await rejectsWith(sendFriendRequest(t.db, b.id, a.username), 409, "already_friends");
    });

    it("lets a player invite again after a rejection, without telling them about it", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        const {id} = await sendFriendRequest(t.db, a.id, b.username);
        await rejectFriendRequest(t.db, b.id, id);

        expect(await areFriends(t.db, a.id, b.id)).toBe(false);
        expect(await typesOf(a.id)).toEqual([]);
        await expect(sendFriendRequest(t.db, a.id, b.username)).resolves.toBeTruthy();
    });

    it("lets the sender withdraw an invitation, which then cannot be accepted", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        const {id} = await sendFriendRequest(t.db, a.id, b.username);
        await cancelFriendRequest(t.db, a.id, id);
        await rejectsWith(acceptFriendRequest(t.db, b.id, id), 409, "request_closed");
        expect(await areFriends(t.db, a.id, b.id)).toBe(false);
    });

    it("does not let a player answer someone else's invitation", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        const stranger = await newPlayer();
        const {id} = await sendFriendRequest(t.db, a.id, b.username);

        await rejectsWith(acceptFriendRequest(t.db, stranger.id, id), 404, "request_not_found");
        await rejectsWith(acceptFriendRequest(t.db, a.id, id), 404, "request_not_found");
        await rejectsWith(rejectFriendRequest(t.db, stranger.id, id), 404, "request_not_found");
        await rejectsWith(cancelFriendRequest(t.db, b.id, id), 404, "request_not_found");
    });

    it("cannot be accepted twice", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        const {id} = await sendFriendRequest(t.db, a.id, b.username);
        await acceptFriendRequest(t.db, b.id, id);
        await rejectsWith(acceptFriendRequest(t.db, b.id, id), 409, "request_closed");
    });

    it("limits how many invitations a player can send", async () => {
        const a = await newPlayer();
        let lastCode = "";
        for (let i = 0; i < 31; i++) {
            lastCode = await sendFriendRequest(t.db, a.id, "nobody_here").catch((error) => error.code);
        }
        expect(lastCode).toBe("too_many_attempts");
    });
});

describe("removing a friend", () => {
    it("ends the friendship on both sides and tells the other player", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        await befriend(a, b);

        await removeFriend(t.db, b.id, a.id);

        expect(await areFriends(t.db, a.id, b.id)).toBe(false);
        expect((await typesOf(a.id))[0]).toBe("friend_removed");
    });

    it("cancels open offers in both directions, which returns the copies", async () => {
        const {a, b} = await friendsWithCards();
        await give(a.id, cardX, 2);
        await give(b.id, cardZ);
        const fromA = await offerXforY(a, b);
        const fromB = await createTrade(t.db, b.id, {toUserId: a.id, offeredCardId: cardZ, requestedCardId: cardX});

        await removeFriend(t.db, a.id, b.id);

        expect(await statusOf(fromA.id)).toBe("cancelled");
        expect(await statusOf(fromB.id)).toBe("cancelled");
        await expect(setIncomeSlot(t.db, a.id, 1, cardX)).resolves.toBeTruthy();
        await expect(setIncomeSlot(t.db, a.id, 2, cardX)).resolves.toBeTruthy();
        await expect(setIncomeSlot(t.db, b.id, 1, cardZ)).resolves.toBeTruthy();
        expect((await typesOf(b.id)).filter((type) => type === "trade_cancelled")).toHaveLength(2);
    });

    it("rejects removing someone who is not a friend", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        await rejectsWith(removeFriend(t.db, a.id, b.id), 404, "not_friends");
    });

    it("allows inviting the same player again", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        await befriend(a, b);
        await removeFriend(t.db, a.id, b.id);
        await expect(sendFriendRequest(t.db, a.id, b.username)).resolves.toBeTruthy();
    });
});

describe("player search", () => {
    it("finds by the start of the nick regardless of case, without the player searching", async () => {
        const me = await newPlayer("Findable");
        const other = await newPlayer("Findable");
        const results = await searchPlayers(t.db, me.id, "fINDABLE");
        expect(results.map((player) => player.id)).toContain(other.id);
        expect(results.map((player) => player.id)).not.toContain(me.id);
    });

    it("treats an underscore as an underscore", async () => {
        const me = await newPlayer("underline");
        await t.db.insert(users).values({username: "underlineX9", email: "x9@example.com", passwordHash: "x"});
        const results = await searchPlayers(t.db, me.id, "underline_");
        expect(results.map((player) => player.username)).not.toContain("underlineX9");
    });

    it("returns only public fields", async () => {
        const me = await newPlayer("publicfields");
        await newPlayer("publicfields");
        const [found] = await searchPlayers(t.db, me.id, "publicfields");
        expect(Object.keys(found).sort()).toEqual(["avatar", "id", "username"]);
    });
});

describe("trade offers", () => {
    it("are only for friends", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        await give(a.id, cardX);
        await give(b.id, cardY);
        await rejectsWith(offerXforY(a, b), 403, "not_friends");
        await rejectsWith(getTradeOptions(t.db, a.id, b.id), 403, "not_friends");
    });

    it("cannot be sent to yourself", async () => {
        const a = await newPlayer();
        await give(a.id, cardX);
        await rejectsWith(offerXforY(a, a), 403, "not_friends");
    });

    it("must swap two different cards", async () => {
        const {a, b} = await friendsWithCards();
        await give(b.id, cardX);
        await rejectsWith(
            createTrade(t.db, a.id, {toUserId: b.id, offeredCardId: cardX, requestedCardId: cardX}),
            400,
            "same_card",
        );
    });

    it("need a free copy on both sides", async () => {
        const {a, b} = await friendsWithCards();
        await rejectsWith(
            createTrade(t.db, a.id, {toUserId: b.id, offeredCardId: cardZ, requestedCardId: cardY}),
            409,
            "card_unavailable",
        );
        await rejectsWith(
            createTrade(t.db, a.id, {toUserId: b.id, offeredCardId: cardX, requestedCardId: cardZ}),
            409,
            "requested_card_unavailable",
        );
    });

    it("cannot include a card that is in an income slot", async () => {
        const {a, b} = await friendsWithCards();
        await setIncomeSlot(t.db, a.id, 1, cardX);
        await rejectsWith(offerXforY(a, b), 409, "card_unavailable");

        await setIncomeSlot(t.db, a.id, 1, null);
        await setIncomeSlot(t.db, b.id, 1, cardY);
        await rejectsWith(offerXforY(a, b), 409, "requested_card_unavailable");
    });

    it("are limited to one per direction of a pair", async () => {
        const {a, b} = await friendsWithCards();
        const c = await newPlayer();
        await befriend(a, c);
        await give(a.id, cardX, 2);
        await give(a.id, cardZ);
        await give(b.id, cardZ);
        await give(c.id, cardY);

        await offerXforY(a, b);
        await rejectsWith(
            createTrade(t.db, a.id, {toUserId: b.id, offeredCardId: cardZ, requestedCardId: cardY}),
            409,
            "offer_exists",
        );

        // The opposite direction and another friend are independent.
        await expect(
            createTrade(t.db, b.id, {toUserId: a.id, offeredCardId: cardZ, requestedCardId: cardX}),
        ).resolves.toBeTruthy();
        await expect(offerXforY(a, c)).resolves.toBeTruthy();
    });

    it("hold the offered copy: it cannot be slotted or offered again until the offer closes", async () => {
        const {a, b} = await friendsWithCards();
        const c = await newPlayer();
        await befriend(a, c);
        await give(c.id, cardY);

        const offer = await offerXforY(a, b);

        await rejectsWith(setIncomeSlot(t.db, a.id, 1, cardX), 409, "card_unavailable");
        await rejectsWith(offerXforY(a, c), 409, "card_unavailable");
        expect((await getTradeOptions(t.db, a.id, b.id)).mine.map((card) => card.id)).not.toContain(cardX);
        expect(await copies(a.id, cardX)).toBe(1);

        await cancelTrade(t.db, a.id, offer.id);

        await expect(setIncomeSlot(t.db, a.id, 1, cardX)).resolves.toBeTruthy();
    });

    it("hold only one copy when the player has more", async () => {
        const {a, b} = await friendsWithCards();
        await give(a.id, cardX, 2);
        await offerXforY(a, b);

        await expect(setIncomeSlot(t.db, a.id, 1, cardX)).resolves.toBeTruthy();
        await rejectsWith(setIncomeSlot(t.db, a.id, 2, cardX), 409, "card_unavailable");
    });

    it("are visible to the player as held copies in the collection", async () => {
        const {a, b} = await friendsWithCards();
        await offerXforY(a, b);

        const owned = await listOwnedCards(t.db, a.id);
        expect(owned.find((card) => card.id === cardX)).toMatchObject({quantity: 1, escrowed: 1});

        const [{setId}] = await t.db.select({setId: cards.setId}).from(cards).where(eq(cards.id, cardX));
        const collection = await getSetCollection(t.db, a.id, setId);
        expect(collection.cards.find((card) => card.id === cardX)).toMatchObject({quantity: 1, escrowed: 1});
    });

    it("do not list a friend's cards that are in a slot or held in an offer", async () => {
        const {a, b} = await friendsWithCards();
        await give(b.id, cardZ);
        await setIncomeSlot(t.db, b.id, 1, cardY);
        await give(a.id, cardZ, 4);

        const {mine, theirs} = await getTradeOptions(t.db, a.id, b.id);

        expect(theirs.map((card) => card.id)).toEqual([cardZ]);
        expect(theirs[0]).toMatchObject({freeCopies: 1, yourCopies: 4});
        expect(mine.map((card) => card.id).sort()).toEqual([cardX, cardZ].sort());
    });
});

describe("accepting a trade", () => {
    it("swaps one copy for one copy and tells the sender", async () => {
        const {a, b} = await friendsWithCards();
        await give(a.id, cardX, 3);
        await give(b.id, cardY, 2);
        const offer = await offerXforY(a, b);

        const inbox = await getInbox(t.db, b.id);
        expect(inbox.items[0]).toMatchObject({
            type: "trade_offer",
            trade: {id: offer.id, status: "pending", incoming: true, offered: {id: cardX}, requested: {id: cardY}},
        });

        const result = await acceptTrade(t.db, b.id, offer.id);

        expect(result.lostCard).toBe(false);
        expect(await copies(a.id, cardX)).toBe(2);
        expect(await copies(a.id, cardY)).toBe(1);
        expect(await copies(b.id, cardY)).toBe(1);
        expect(await copies(b.id, cardX)).toBe(1);
        expect(await statusOf(offer.id)).toBe("accepted");
        expect((await typesOf(a.id))[0]).toBe("trade_accepted");
        expect((await listTrades(t.db, a.id)).outgoing).toEqual([]);
    });

    it("removes the ownership row when the last copy leaves", async () => {
        const {a, b} = await friendsWithCards();
        const offer = await offerXforY(a, b);
        await acceptTrade(t.db, b.id, offer.id);
        expect(await copies(a.id, cardX)).toBe(0);
        expect(await copies(b.id, cardY)).toBe(0);
    });

    it("can only be done by the recipient", async () => {
        const {a, b} = await friendsWithCards();
        const stranger = await newPlayer();
        const offer = await offerXforY(a, b);

        await rejectsWith(acceptTrade(t.db, a.id, offer.id), 404, "trade_not_found");
        await rejectsWith(acceptTrade(t.db, stranger.id, offer.id), 404, "trade_not_found");
        await rejectsWith(rejectTrade(t.db, stranger.id, offer.id), 404, "trade_not_found");
        await rejectsWith(cancelTrade(t.db, b.id, offer.id), 404, "trade_not_found");
        expect(await statusOf(offer.id)).toBe("pending");
    });

    it("leaves the offer open when the recipient no longer has a free copy", async () => {
        const {a, b} = await friendsWithCards();
        const offer = await offerXforY(a, b);
        await setIncomeSlot(t.db, b.id, 1, cardY);

        await rejectsWith(acceptTrade(t.db, b.id, offer.id), 409, "requested_card_unavailable");

        expect(await statusOf(offer.id)).toBe("pending");
        expect(await copies(a.id, cardX)).toBe(1);
        expect(await copies(b.id, cardY)).toBe(1);

        await setIncomeSlot(t.db, b.id, 1, null);
        await expect(acceptTrade(t.db, b.id, offer.id)).resolves.toBeTruthy();
    });

    it("counts the recipient's own open offer against the copy they would give", async () => {
        const {a, b} = await friendsWithCards();
        const c = await newPlayer();
        await befriend(b, c);
        await give(c.id, cardZ);
        const offer = await offerXforY(a, b);
        await createTrade(t.db, b.id, {toUserId: c.id, offeredCardId: cardY, requestedCardId: cardZ});

        await rejectsWith(acceptTrade(t.db, b.id, offer.id), 409, "requested_card_unavailable");
        expect(await statusOf(offer.id)).toBe("pending");
    });

    it("lets only one of two offers for the same copy succeed", async () => {
        const {a, b} = await friendsWithCards();
        const c = await newPlayer();
        await befriend(c, b);
        await give(c.id, cardZ);
        const first = await offerXforY(a, b);
        const second = await createTrade(t.db, c.id, {toUserId: b.id, offeredCardId: cardZ, requestedCardId: cardY});

        await acceptTrade(t.db, b.id, first.id);

        await rejectsWith(acceptTrade(t.db, b.id, second.id), 409, "requested_card_unavailable");
        expect(await copies(c.id, cardZ)).toBe(1);
    });

    it("cannot happen twice, nor after the offer closed", async () => {
        const {a, b} = await friendsWithCards();
        const accepted = await offerXforY(a, b);
        await acceptTrade(t.db, b.id, accepted.id);
        await rejectsWith(acceptTrade(t.db, b.id, accepted.id), 409, "trade_closed");
        await rejectsWith(rejectTrade(t.db, b.id, accepted.id), 409, "trade_closed");
        await rejectsWith(cancelTrade(t.db, a.id, accepted.id), 409, "trade_closed");
    });

    it("lets exactly one of accept and cancel win when they race", async () => {
        for (let attempt = 0; attempt < 5; attempt++) {
            const {a, b} = await friendsWithCards();
            const offer = await offerXforY(a, b);

            const outcomes = await Promise.allSettled([
                acceptTrade(t.db, b.id, offer.id),
                cancelTrade(t.db, a.id, offer.id),
            ]);

            expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
            const accepted = (await statusOf(offer.id)) === "accepted";
            expect(await copies(a.id, cardX)).toBe(accepted ? 0 : 1);
            expect(await copies(b.id, cardX)).toBe(accepted ? 1 : 0);
        }
    });

    it("never gives a card twice when two accepts race", async () => {
        const {a, b} = await friendsWithCards();
        const offer = await offerXforY(a, b);

        const outcomes = await Promise.allSettled([
            acceptTrade(t.db, b.id, offer.id),
            acceptTrade(t.db, b.id, offer.id),
        ]);

        expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
        expect(await copies(b.id, cardX)).toBe(1);
    });

    it("unlocks achievements for both players", async () => {
        const {a, b} = await friendsWithCards();
        const [{id: achievementId}] = await t.db
            .insert(achievements)
            .values({
                id: 9001,
                title: "Testowe: 1 karta",
                description: "x",
                rarity: "common",
                type: "cards_overall",
                amount: 1,
                rewardCoins: 1,
            })
            .returning({id: achievements.id});
        const offer = await offerXforY(a, b);

        const {earned} = await acceptTrade(t.db, b.id, offer.id);

        expect(earned.achievements.map((achievement) => achievement.id)).toContain(achievementId);
        const unlockedByA = await t.db
            .select()
            .from(userAchievements)
            .where(and(eq(userAchievements.userId, a.id), eq(userAchievements.achievementId, achievementId)));
        expect(unlockedByA).toHaveLength(1);
        await t.db.delete(userAchievements).where(eq(userAchievements.achievementId, achievementId));
        await t.db.delete(achievements).where(eq(achievements.id, achievementId));
    });
});

describe("the limit of 9 copies in a trade", () => {
    it("warns the recipient and loses the copy they receive", async () => {
        const {a, b} = await friendsWithCards();
        await give(b.id, cardX, 9);
        const offer = await offerXforY(a, b);

        expect((await listTrades(t.db, b.id)).incoming[0].receivedOverLimit).toBe(true);
        expect((await getInbox(t.db, b.id)).items[0].trade?.receivedOverLimit).toBe(true);

        const {lostCard} = await acceptTrade(t.db, b.id, offer.id);

        expect(lostCard).toBe(true);
        expect(await copies(b.id, cardX)).toBe(9);
        expect(await copies(a.id, cardX)).toBe(0);
        expect(await copies(a.id, cardY)).toBe(1);
    });

    it("warns the sender and tells them when the card they receive was lost", async () => {
        const {a, b} = await friendsWithCards();
        await give(a.id, cardY, 9);
        const offer = await offerXforY(a, b);

        expect((await listTrades(t.db, a.id)).outgoing[0].receivedOverLimit).toBe(true);
        expect((await getTradeOptions(t.db, a.id, b.id)).theirs.length).toBe(1);

        const {lostCard} = await acceptTrade(t.db, b.id, offer.id);

        expect(lostCard).toBe(false);
        expect(await copies(a.id, cardY)).toBe(9);
        expect((await getInbox(t.db, a.id)).items[0]).toMatchObject({type: "trade_accepted", lostCard: true});
    });
});

describe("closing an offer", () => {
    it("by rejection returns the copy and tells the sender", async () => {
        const {a, b} = await friendsWithCards();
        const offer = await offerXforY(a, b);

        await rejectTrade(t.db, b.id, offer.id);

        expect(await statusOf(offer.id)).toBe("rejected");
        expect((await typesOf(a.id))[0]).toBe("trade_rejected");
        await expect(setIncomeSlot(t.db, a.id, 1, cardX)).resolves.toBeTruthy();
    });

    it("by withdrawal returns the copy, tells the recipient and allows a new offer", async () => {
        const {a, b} = await friendsWithCards();
        const offer = await offerXforY(a, b);

        await cancelTrade(t.db, a.id, offer.id);

        expect((await typesOf(b.id))[0]).toBe("trade_cancelled");
        await expect(offerXforY(a, b)).resolves.toBeTruthy();
    });
});

describe("showcase", () => {
    const stats = ["trades" as const];

    it("cannot contain a card from outside the collection", async () => {
        const a = await newPlayer();
        await give(a.id, cardX);
        await rejectsWith(updateProfile(t.db, a.id, {stats, showcase: [cardX, cardY]}), 409, "card_not_owned");
        expect((await getProfile(t.db, a.id, a.id)).showcase).toEqual([]);
    });

    it("keeps the chosen order and replaces the previous choice", async () => {
        const a = await newPlayer();
        await give(a.id, cardX);
        await give(a.id, cardY);
        await give(a.id, cardZ);

        await updateProfile(t.db, a.id, {stats, showcase: [cardZ, cardX]});
        expect((await getProfile(t.db, a.id, a.id)).showcase.map((card) => card.id)).toEqual([cardZ, cardX]);

        await updateProfile(t.db, a.id, {stats, showcase: [cardY]});
        expect((await getProfile(t.db, a.id, a.id)).showcase.map((card) => card.id)).toEqual([cardY]);
    });

    it("does not lock a card", async () => {
        const {a, b} = await friendsWithCards();
        await updateProfile(t.db, a.id, {stats, showcase: [cardX]});
        await expect(setIncomeSlot(t.db, a.id, 1, cardX)).resolves.toBeTruthy();
        await setIncomeSlot(t.db, a.id, 1, null);
        await expect(offerXforY(a, b)).resolves.toBeTruthy();
    });

    it("loses a card only when the last copy is traded away", async () => {
        const {a, b} = await friendsWithCards();
        await give(a.id, cardX, 2);
        await updateProfile(t.db, a.id, {stats, showcase: [cardX]});

        const first = await offerXforY(a, b);
        expect((await getProfile(t.db, b.id, a.id)).showcase).toHaveLength(1);
        await acceptTrade(t.db, b.id, first.id);
        expect(await copies(a.id, cardX)).toBe(1);
        expect((await getProfile(t.db, b.id, a.id)).showcase).toHaveLength(1);

        await give(b.id, cardY);
        const second = await offerXforY(a, b);
        await acceptTrade(t.db, b.id, second.id);
        expect(await copies(a.id, cardX)).toBe(0);
        expect((await getProfile(t.db, b.id, a.id)).showcase).toEqual([]);
    });

    it("also loses the recipient's card when they give their last copy", async () => {
        const {a, b} = await friendsWithCards();
        await updateProfile(t.db, b.id, {stats, showcase: [cardY]});
        const offer = await offerXforY(a, b);
        await acceptTrade(t.db, b.id, offer.id);
        const rows = await t.db.select().from(showcase).where(eq(showcase.userId, b.id));
        expect(rows).toEqual([]);
    });
});

describe("profile", () => {
    it("shows the default statistics until the player chooses, then those chosen, in order", async () => {
        const a = await newPlayer();
        expect((await getProfile(t.db, a.id, a.id)).stats.map((stat) => stat.stat)).toEqual([
            "unique_cards",
            "packs_opened",
            "achievements",
        ]);

        await updateProfile(t.db, a.id, {stats: ["days_in_game", "trades"], showcase: []});

        expect((await getProfile(t.db, a.id, a.id)).stats.map((stat) => stat.stat)).toEqual(["days_in_game", "trades"]);
        expect(await getProfileChoices(t.db, a.id)).toEqual({stats: ["days_in_game", "trades"], showcase: []});
        expect(await t.db.select().from(profileStats).where(eq(profileStats.userId, a.id))).toHaveLength(2);
    });

    it("can compute every statistic, also for a player with nothing", async () => {
        const a = await newPlayer();
        const stat = async (name: (typeof PROFILE_STATS)[number]) => {
            await updateProfile(t.db, a.id, {stats: [name], showcase: []});
            return (await getProfile(t.db, a.id, a.id)).stats[0].value;
        };
        const values: Partial<Record<(typeof PROFILE_STATS)[number], string>> = {};
        for (const name of PROFILE_STATS) values[name] = await stat(name);
        expect(values).toMatchObject({
            collection_percent: "0%",
            packs_opened: "0",
            achievements: "0",
            badges: "0",
            completed_sets: "0",
            rarest_card: "Jeszcze brak",
            favorite_set: "Jeszcze brak",
            trades: "0",
            income_per_hour: "0/h",
            days_in_game: "1",
        });
        expect(values.unique_cards).toMatch(/^0 z /);
    });

    it("counts what the player has done", async () => {
        const {a, b} = await friendsWithCards();
        const stat = async (name: (typeof PROFILE_STATS)[number]) => {
            await updateProfile(t.db, a.id, {stats: [name], showcase: []});
            return (await getProfile(t.db, a.id, a.id)).stats[0].value;
        };
        const [{income, rarity}] = await t.db
            .select({income: cards.income, rarity: cards.rarity})
            .from(cards)
            .where(eq(cards.id, cardX));
        expect(rarity).toBeTruthy();

        await setIncomeSlot(t.db, a.id, 1, cardX);
        expect(await stat("income_per_hour")).toBe(`${income}/h`);
        await setIncomeSlot(t.db, a.id, 1, null);

        const offer = await offerXforY(a, b);
        await acceptTrade(t.db, b.id, offer.id);
        expect(await stat("trades")).toBe("1");

        const [card] = await t.db.select().from(cards).where(eq(cards.id, cardY));
        expect(await stat("rarest_card")).toBe(card.name);

        const [firstSet] = await t.db.select().from(sets).limit(1);
        await t.db.insert(packOpenings).values({
            userId: a.id,
            setId: firstSet.id,
            source: "shop",
            price: 0,
            cards: [],
            isGodPack: false,
        });
        expect(await stat("packs_opened")).toBe("1");
        expect(await stat("favorite_set")).toBe(firstSet.name);
    });

    it("counts a completed set when every card of it is owned", async () => {
        const a = await newPlayer();
        const setsWithSizes = await t.db.select({id: cards.id, setId: cards.setId}).from(cards);
        const bySet = Map.groupBy(setsWithSizes, (card) => card.setId);
        const [smallest] = [...bySet.values()].sort((x, y) => x.length - y.length);
        await t.db.insert(userCards).values(smallest.map((card) => ({userId: a.id, cardId: card.id, quantity: 1})));

        await updateProfile(t.db, a.id, {stats: ["completed_sets"], showcase: []});

        expect((await getProfile(t.db, a.id, a.id)).stats[0].value).toBe("1");
    });

    it("never contains an email", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        const profile = JSON.stringify(await getProfile(t.db, a.id, b.id));
        expect(profile).not.toContain("example.com");
        expect(profile).not.toContain("passwordHash");
    });

    it("describes how the viewer and the player are related", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        const relation = async (viewer: {id: string}, target: {id: string}) => {
            const {relation, requestId, hasOpenOffer} = await getProfile(t.db, viewer.id, target.id);
            return {relation, requestId, hasOpenOffer};
        };

        expect(await relation(a, a)).toMatchObject({relation: "self"});
        expect(await relation(a, b)).toMatchObject({relation: "none", requestId: null});

        const {id} = await sendFriendRequest(t.db, a.id, b.username);
        expect(await relation(a, b)).toEqual({relation: "invited", requestId: id, hasOpenOffer: false});
        expect(await relation(b, a)).toEqual({relation: "invited_you", requestId: id, hasOpenOffer: false});

        await acceptFriendRequest(t.db, b.id, id);
        expect(await relation(a, b)).toEqual({relation: "friend", requestId: null, hasOpenOffer: false});

        await give(a.id, cardX);
        await give(b.id, cardY);
        await offerXforY(a, b);
        expect((await relation(a, b)).hasOpenOffer).toBe(true);
        expect((await relation(b, a)).hasOpenOffer).toBe(false);
    });

    it("rejects a player who does not exist", async () => {
        const a = await newPlayer();
        await rejectsWith(getProfile(t.db, a.id, "00000000-0000-4000-8000-000000000000"), 404, "player_not_found");
    });
});

describe("inbox", () => {
    it("marks only what the player has seen", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        const c = await newPlayer();
        await sendFriendRequest(t.db, a.id, c.username);
        const seen = await getInbox(t.db, c.id);
        await sendFriendRequest(t.db, b.id, c.username);

        const {unread} = await markNotificationsRead(t.db, c.id, seen.items[0].id);

        expect(unread).toBe(1);
        const inbox = await getInbox(t.db, c.id);
        expect(inbox.items.map((item) => [item.actor.id, item.read])).toEqual([
            [b.id, false],
            [a.id, true],
        ]);
    });

    it("does not touch other players' notifications", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        const c = await newPlayer();
        await sendFriendRequest(t.db, a.id, b.username);
        const [row] = (await getInbox(t.db, b.id)).items;

        await markNotificationsRead(t.db, c.id, row.id);

        expect(await countUnread(t.db, b.id)).toBe(1);
    });

    it("keeps an invitation that was read but not answered", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        await sendFriendRequest(t.db, a.id, b.username);
        const [row] = (await getInbox(t.db, b.id)).items;
        await markNotificationsRead(t.db, b.id, row.id);

        expect((await getInbox(t.db, b.id)).items[0]).toMatchObject({read: true, friendRequest: {pending: true}});
    });

    it("does not record anything when the action fails", async () => {
        const {a, b} = await friendsWithCards();
        const before = await countUnread(t.db, b.id);
        await rejectsWith(
            createTrade(t.db, a.id, {toUserId: b.id, offeredCardId: cardX, requestedCardId: cardZ}),
            409,
            "requested_card_unavailable",
        );
        expect(await countUnread(t.db, b.id)).toBe(before);
    });
});

describe("deleting an account", () => {
    async function withPassword(player: {id: string}) {
        const passwordHash = await hashPassword("password123");
        await t.db.update(users).set({passwordHash}).where(eq(users.id, player.id));
    }

    it("releases the other player's copy and removes the offer", async () => {
        const {a, b} = await friendsWithCards();
        await withPassword(b);
        const offer = await offerXforY(a, b);

        await deleteAccount(t.db, b.id, "password123");

        expect(await t.db.select().from(trades).where(eq(trades.id, offer.id))).toEqual([]);
        await expect(setIncomeSlot(t.db, a.id, 1, cardX)).resolves.toBeTruthy();
        expect((await listFriends(t.db, a.id)).friends).toEqual([]);
        expect(await t.db.select().from(friendships).where(eq(friendships.userB, b.id))).toEqual([]);
    });

    it("removes what others were told about the player", async () => {
        const a = await newPlayer();
        const b = await newPlayer();
        await withPassword(b);
        await befriend(b, a);
        expect((await getInbox(t.db, a.id)).items.length).toBeGreaterThan(0);

        await deleteAccount(t.db, b.id, "password123");

        expect((await getInbox(t.db, a.id)).items).toEqual([]);
        expect(await t.db.select().from(notifications).where(eq(notifications.userId, a.id))).toEqual([]);
        expect(await countUnread(t.db, a.id)).toBe(0);
    });

    it("works with a card in the showcase and in a slot", async () => {
        const a = await newPlayer();
        await withPassword(a);
        await give(a.id, cardX);
        await updateProfile(t.db, a.id, {stats: ["trades"], showcase: [cardX]});
        await setIncomeSlot(t.db, a.id, 1, cardX);

        await deleteAccount(t.db, a.id, "password123");

        expect(await t.db.select().from(users).where(eq(users.id, a.id))).toEqual([]);
    });
});
