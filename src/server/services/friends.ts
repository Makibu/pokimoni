import {and, asc, eq, or} from "drizzle-orm";
import {friendPair} from "@/domain/trades";
import {isRateLimited, LIMITS, recordAttempt} from "@/server/auth/rate-limit";
import {violatedUniqueConstraint} from "@/server/db/errors";
import {friendRequests, friendships, trades, users} from "@/server/db/schema";
import type {Db, Tx} from "@/server/db/types";
import {AppError} from "@/server/http/errors";
import {notify} from "./notify";
import {loadPlayers, type PublicPlayer} from "./players";
import {lockPlayers} from "./wallet";

const requestExists = () => new AppError(409, "request_exists", "Zaproszenie do tego gracza już czeka na odpowiedź");
const requestNotFound = () => new AppError(404, "request_not_found", "Nie znaleziono zaproszenia");
const requestClosed = () => new AppError(409, "request_closed", "To zaproszenie jest już nieaktualne");

export async function areFriends(db: Db | Tx, a: string, b: string): Promise<boolean> {
    const {userA, userB} = friendPair(a, b);
    const [row] = await db
        .select({userA: friendships.userA})
        .from(friendships)
        .where(and(eq(friendships.userA, userA), eq(friendships.userB, userB)));
    return row !== undefined;
}

export function betweenPlayers(
    from: typeof friendRequests.fromUserId | typeof trades.fromUserId,
    to: typeof friendRequests.toUserId | typeof trades.toUserId,
    a: string,
    b: string,
) {
    return or(and(eq(from, a), eq(to, b)), and(eq(from, b), eq(to, a)));
}

export type FriendRequestView = {id: number; player: PublicPlayer; createdAt: string};

export type FriendsView = {
    friends: PublicPlayer[];
    incoming: FriendRequestView[];
    outgoing: FriendRequestView[];
};

export async function listFriends(db: Db, userId: string): Promise<FriendsView> {
    const [pairs, requests] = await Promise.all([
        db
            .select()
            .from(friendships)
            .where(or(eq(friendships.userA, userId), eq(friendships.userB, userId))),
        db
            .select()
            .from(friendRequests)
            .where(
                and(
                    eq(friendRequests.status, "pending"),
                    or(eq(friendRequests.fromUserId, userId), eq(friendRequests.toUserId, userId)),
                ),
            )
            .orderBy(asc(friendRequests.id)),
    ]);

    const friendIds = pairs.map((pair) => (pair.userA === userId ? pair.userB : pair.userA));
    const partnerOf = (request: (typeof requests)[number]) =>
        request.fromUserId === userId ? request.toUserId : request.fromUserId;
    const players = await loadPlayers(db, [...friendIds, ...requests.map(partnerOf)]);

    const toView = (request: (typeof requests)[number]): FriendRequestView => ({
        id: request.id,
        player: players.get(partnerOf(request)) as PublicPlayer,
        createdAt: request.createdAt.toISOString(),
    });

    return {
        friends: friendIds
            .map((id) => players.get(id) as PublicPlayer)
            .sort((a, b) => a.username.localeCompare(b.username, "pl")),
        incoming: requests.filter((request) => request.toUserId === userId).map(toView),
        outgoing: requests.filter((request) => request.fromUserId === userId).map(toView),
    };
}

export async function sendFriendRequest(db: Db, userId: string, username: string) {
    const key = `friend-request:user:${userId}`;
    if (await isRateLimited(db, key, LIMITS.friendRequestsPerUser)) {
        throw new AppError(429, "too_many_attempts", "Zbyt wiele zaproszeń. Spróbuj ponownie za kilka minut");
    }
    await recordAttempt(db, key);

    const [target] = await db.select({id: users.id}).from(users).where(eq(users.usernameKey, username.toLowerCase()));
    if (!target) throw new AppError(404, "player_not_found", "Nie ma gracza o takim nicku");
    if (target.id === userId) throw new AppError(400, "self_request", "Nie możesz zaprosić samego siebie");

    try {
        return await db.transaction(async (tx) => {
            if (await areFriends(tx, userId, target.id)) {
                throw new AppError(409, "already_friends", "Jesteście już znajomymi");
            }
            const [pending] = await tx
                .select()
                .from(friendRequests)
                .where(
                    and(
                        eq(friendRequests.status, "pending"),
                        betweenPlayers(friendRequests.fromUserId, friendRequests.toUserId, userId, target.id),
                    ),
                );
            if (pending?.fromUserId === userId) throw requestExists();
            if (pending) {
                throw new AppError(
                    409,
                    "request_received",
                    "Masz już zaproszenie od tego gracza. Odpowiedz na nie w skrzynce",
                );
            }

            const [request] = await tx
                .insert(friendRequests)
                .values({fromUserId: userId, toUserId: target.id})
                .returning({id: friendRequests.id});
            await notify(tx, target.id, "friend_request", {actorId: userId, requestId: request.id});
            return {id: request.id};
        });
    } catch (error) {
        // Two requests sent at the same moment: the index lets only one of them through.
        if (violatedUniqueConstraint(error) !== null) throw requestExists();
        throw error;
    }
}

/** Locks the request, so that an answer and a withdrawal sent at the same moment cannot both succeed. */
async function lockPendingRequest(tx: Tx, requestId: number, isAllowed: (row: RequestRow) => boolean) {
    const [request] = await tx.select().from(friendRequests).where(eq(friendRequests.id, requestId)).for("update");
    if (!request || !isAllowed(request)) throw requestNotFound();
    if (request.status !== "pending") throw requestClosed();
    return request;
}

type RequestRow = typeof friendRequests.$inferSelect;

export async function acceptFriendRequest(db: Db, userId: string, requestId: number, now = new Date()) {
    await db.transaction(async (tx) => {
        const request = await lockPendingRequest(tx, requestId, (row) => row.toUserId === userId);
        await tx.insert(friendships).values(friendPair(request.fromUserId, request.toUserId)).onConflictDoNothing();
        await tx
            .update(friendRequests)
            .set({status: "accepted", resolvedAt: now})
            .where(eq(friendRequests.id, requestId));
        await notify(tx, request.fromUserId, "friend_accepted", {actorId: userId, requestId});
    });
}

export async function rejectFriendRequest(db: Db, userId: string, requestId: number, now = new Date()) {
    await db.transaction(async (tx) => {
        await lockPendingRequest(tx, requestId, (row) => row.toUserId === userId);
        await tx
            .update(friendRequests)
            .set({status: "rejected", resolvedAt: now})
            .where(eq(friendRequests.id, requestId));
    });
}

export async function cancelFriendRequest(db: Db, userId: string, requestId: number, now = new Date()) {
    await db.transaction(async (tx) => {
        await lockPendingRequest(tx, requestId, (row) => row.fromUserId === userId);
        await tx
            .update(friendRequests)
            .set({status: "cancelled", resolvedAt: now})
            .where(eq(friendRequests.id, requestId));
    });
}

/** Ends the friendship and cancels open offers in both directions, which returns the offered copies. */
export async function removeFriend(db: Db, userId: string, friendId: string, now = new Date()) {
    if (friendId === userId) throw new AppError(404, "not_friends", "Ten gracz nie jest Twoim znajomym");
    await db.transaction(async (tx) => {
        await lockPlayers(tx, userId, friendId);
        const {userA, userB} = friendPair(userId, friendId);
        const removed = await tx
            .delete(friendships)
            .where(and(eq(friendships.userA, userA), eq(friendships.userB, userB)))
            .returning();
        if (removed.length === 0) throw new AppError(404, "not_friends", "Ten gracz nie jest Twoim znajomym");

        const cancelled = await tx
            .update(trades)
            .set({status: "cancelled", resolvedAt: now})
            .where(
                and(eq(trades.status, "pending"), betweenPlayers(trades.fromUserId, trades.toUserId, userId, friendId)),
            )
            .returning({id: trades.id});

        await notify(tx, friendId, "friend_removed", {actorId: userId});
        for (const trade of cancelled) {
            await notify(tx, friendId, "trade_cancelled", {actorId: userId, tradeId: trade.id});
        }
    });
}
