import {and, count, desc, eq, inArray, isNull, lte} from "drizzle-orm";
import {friendRequests, notifications, trades} from "@/server/db/schema";
import type {Db} from "@/server/db/types";
import type {NotificationPayload, NotificationType} from "./notify";
import {loadPlayers, type PublicPlayer} from "./players";
import {loadTradeViews, type TradeView} from "./trades";

const INBOX_SIZE = 30;

export type InboxItem = {
    id: number;
    type: NotificationType;
    createdAt: string;
    read: boolean;
    actor: PublicPlayer;
    /** Set for an invitation; `pending` says whether it can still be answered. */
    friendRequest: {id: number; pending: boolean} | null;
    trade: TradeView | null;
    lostCard: boolean;
};

export type Inbox = {items: InboxItem[]; unread: number};

export async function countUnread(db: Db, userId: string): Promise<number> {
    const [{unread}] = await db
        .select({unread: count()})
        .from(notifications)
        .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return unread;
}

export async function getInbox(db: Db, userId: string): Promise<Inbox> {
    const [rows, unread] = await Promise.all([
        db
            .select()
            .from(notifications)
            .where(eq(notifications.userId, userId))
            .orderBy(desc(notifications.id))
            .limit(INBOX_SIZE),
        countUnread(db, userId),
    ]);
    const entries = rows.map((row) => ({row, payload: row.payload as NotificationPayload}));
    const requestIds = entries.flatMap(({row, payload}) =>
        row.type === "friend_request" && payload.requestId ? [payload.requestId] : [],
    );
    const tradeIds = entries.flatMap(({payload}) => (payload.tradeId ? [payload.tradeId] : []));

    const [actors, requests, tradeRows] = await Promise.all([
        loadPlayers(db, [...new Set(entries.map(({payload}) => payload.actorId))]),
        requestIds.length > 0
            ? db
                  .select({id: friendRequests.id, status: friendRequests.status})
                  .from(friendRequests)
                  .where(inArray(friendRequests.id, requestIds))
            : [],
        tradeIds.length > 0 ? db.select().from(trades).where(inArray(trades.id, tradeIds)) : [],
    ]);
    const requestStatus = new Map(requests.map((request) => [request.id, request.status]));
    const tradeViews = await loadTradeViews(db, userId, tradeRows);

    const items = entries.flatMap(({row, payload}): InboxItem[] => {
        const actor = actors.get(payload.actorId);
        if (!actor) return [];
        const status = payload.requestId ? requestStatus.get(payload.requestId) : undefined;
        return [
            {
                id: row.id,
                type: row.type,
                createdAt: row.createdAt.toISOString(),
                read: row.readAt !== null,
                actor,
                friendRequest:
                    row.type === "friend_request" && payload.requestId && status
                        ? {id: payload.requestId, pending: status === "pending"}
                        : null,
                trade: (payload.tradeId && tradeViews.get(payload.tradeId)) || null,
                lostCard: payload.lostCard === true,
            },
        ];
    });

    return {items, unread};
}

/**
 * Marks notifications up to the newest one the player has seen. One that arrived after the list was loaded
 * stays unread, so opening the inbox cannot hide it.
 */
export async function markNotificationsRead(db: Db, userId: string, upToId: number, now = new Date()) {
    await db
        .update(notifications)
        .set({readAt: now})
        .where(and(eq(notifications.userId, userId), lte(notifications.id, upToId), isNull(notifications.readAt)));
    return {unread: await countUnread(db, userId)};
}
