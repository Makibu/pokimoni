import {and, count, desc, eq, inArray, or, sql} from "drizzle-orm";
import {type Rarity, rarityRank} from "@/domain/rarity";
import {MAX_CARD_COPIES} from "@/domain/economy";
import {freeCopies, receiveCopy} from "@/domain/trades";
import {isRateLimited, LIMITS, recordAttempt} from "@/server/auth/rate-limit";
import {cards, playerState, showcase, trades, userCards} from "@/server/db/schema";
import type {Db, Tx} from "@/server/db/types";
import {AppError} from "@/server/http/errors";
import type {CreateTradeInput} from "@/lib/validation/social";
import {areFriends} from "./friends";
import {notify} from "./notify";
import {loadPlayers, type PublicPlayer} from "./players";
import {evaluateProgress} from "./progress";
import {availableCopies, lockPlayers} from "./wallet";

export type TradeCard = {
    id: string;
    name: string;
    rarity: Rarity;
    income: number;
    imageSmall: string;
    imageLarge: string;
};

export type TradableCard = TradeCard & {freeCopies: number; yourCopies: number};

/** An offer from the point of view of one of its sides. */
export type TradeView = {
    id: number;
    status: "pending" | "accepted" | "rejected" | "cancelled";
    createdAt: string;
    incoming: boolean;
    partner: PublicPlayer;
    offered: TradeCard;
    requested: TradeCard;
    /** The viewer already has the limit of copies of what they would receive, so that copy would be lost. */
    receivedOverLimit: boolean;
};

type TradeRow = typeof trades.$inferSelect;

const notFriends = () => new AppError(403, "not_friends", "Wymieniać się można tylko ze znajomymi");
const tradeNotFound = () => new AppError(404, "trade_not_found", "Nie znaleziono oferty");
const tradeClosed = () => new AppError(409, "trade_closed", "Ta oferta jest już nieaktualna");

function toTradeCard(row: {
    id: string;
    name: string;
    rarity: Rarity;
    income: number;
    images: {small: string; large: string};
}): TradeCard {
    return {
        id: row.id,
        name: row.name,
        rarity: row.rarity,
        income: row.income,
        imageSmall: row.images.small,
        imageLarge: row.images.large,
    };
}

const tradeCardFields = {
    id: cards.id,
    name: cards.name,
    rarity: cards.rarity,
    income: cards.income,
    images: cards.images,
};

export async function loadTradeViews(db: Db, viewerId: string, rows: TradeRow[]): Promise<Map<number, TradeView>> {
    if (rows.length === 0) return new Map();
    const cardIds = [...new Set(rows.flatMap((row) => [row.offeredCardId, row.requestedCardId]))];
    const partnerOf = (row: TradeRow) => (row.fromUserId === viewerId ? row.toUserId : row.fromUserId);

    const [cardRows, partners, ownedRows] = await Promise.all([
        db.select(tradeCardFields).from(cards).where(inArray(cards.id, cardIds)),
        loadPlayers(db, rows.map(partnerOf)),
        db
            .select({cardId: userCards.cardId, quantity: userCards.quantity})
            .from(userCards)
            .where(and(eq(userCards.userId, viewerId), inArray(userCards.cardId, cardIds))),
    ]);
    const cardById = new Map(cardRows.map((card) => [card.id, toTradeCard(card)]));
    const owned = new Map(ownedRows.map((row) => [row.cardId, row.quantity]));

    return new Map(
        rows.map((row) => {
            const incoming = row.toUserId === viewerId;
            const received = incoming ? row.offeredCardId : row.requestedCardId;
            const view: TradeView = {
                id: row.id,
                status: row.status,
                createdAt: row.createdAt.toISOString(),
                incoming,
                partner: partners.get(partnerOf(row)) as PublicPlayer,
                offered: cardById.get(row.offeredCardId) as TradeCard,
                requested: cardById.get(row.requestedCardId) as TradeCard,
                receivedOverLimit: (owned.get(received) ?? 0) >= MAX_CARD_COPIES,
            };
            return [row.id, view];
        }),
    );
}

/** Open offers the player sent or received, the newest first. */
export async function listTrades(db: Db, userId: string): Promise<{incoming: TradeView[]; outgoing: TradeView[]}> {
    const rows = await db
        .select()
        .from(trades)
        .where(and(eq(trades.status, "pending"), or(eq(trades.fromUserId, userId), eq(trades.toUserId, userId))))
        .orderBy(desc(trades.id));
    const views = await loadTradeViews(db, userId, rows);
    const all = rows.map((row) => views.get(row.id) as TradeView);
    return {incoming: all.filter((view) => view.incoming), outgoing: all.filter((view) => !view.incoming)};
}

/** Cards of one player that can go into an offer now, and how many copies of each the viewer has. */
async function tradableCards(db: Db, ownerId: string, viewerId: string): Promise<TradableCard[]> {
    const [rows, [state], escrow, viewerCards] = await Promise.all([
        db
            .select({...tradeCardFields, quantity: userCards.quantity})
            .from(userCards)
            .innerJoin(cards, eq(cards.id, userCards.cardId))
            .where(eq(userCards.userId, ownerId)),
        db
            .select({slot1: playerState.slot1CardId, slot2: playerState.slot2CardId})
            .from(playerState)
            .where(eq(playerState.userId, ownerId)),
        db
            .select({cardId: trades.offeredCardId, n: count()})
            .from(trades)
            .where(and(eq(trades.fromUserId, ownerId), eq(trades.status, "pending")))
            .groupBy(trades.offeredCardId),
        db
            .select({cardId: userCards.cardId, quantity: userCards.quantity})
            .from(userCards)
            .where(eq(userCards.userId, viewerId)),
    ]);
    const escrowed = new Map(escrow.map((row) => [row.cardId, row.n]));
    const viewerOwned = new Map(viewerCards.map((row) => [row.cardId, row.quantity]));

    return rows
        .map((row) => {
            const slotted = [state.slot1, state.slot2].filter((id) => id === row.id).length;
            return {
                ...toTradeCard(row),
                freeCopies: freeCopies(row.quantity, slotted, escrowed.get(row.id) ?? 0),
                yourCopies: viewerOwned.get(row.id) ?? 0,
            };
        })
        .filter((card) => card.freeCopies > 0)
        .sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || a.name.localeCompare(b.name, "pl"));
}

export async function getTradeOptions(db: Db, userId: string, friendId: string) {
    if (!(await areFriends(db, userId, friendId))) throw notFriends();
    const [mine, theirs] = await Promise.all([tradableCards(db, userId, userId), tradableCards(db, friendId, userId)]);
    return {mine, theirs};
}

export async function createTrade(db: Db, userId: string, input: CreateTradeInput) {
    const key = `trade-offer:user:${userId}`;
    if (await isRateLimited(db, key, LIMITS.tradeOffersPerUser)) {
        throw new AppError(429, "too_many_attempts", "Zbyt wiele ofert. Spróbuj ponownie za kilka minut");
    }
    await recordAttempt(db, key);

    if (input.toUserId === userId) throw notFriends();
    if (input.offeredCardId === input.requestedCardId) {
        throw new AppError(400, "same_card", "Wybierz dwie różne karty");
    }

    return db.transaction(async (tx) => {
        const [sender, recipient] = await lockPlayers(tx, userId, input.toUserId);
        if (!(await areFriends(tx, userId, input.toUserId))) throw notFriends();

        const [open] = await tx
            .select({id: trades.id})
            .from(trades)
            .where(
                and(eq(trades.fromUserId, userId), eq(trades.toUserId, input.toUserId), eq(trades.status, "pending")),
            );
        if (open) throw new AppError(409, "offer_exists", "Masz już otwartą ofertę dla tego gracza");

        if ((await availableCopies(tx, userId, sender, input.offeredCardId)) < 1) {
            throw new AppError(409, "card_unavailable", "Nie masz wolnego egzemplarza tej karty");
        }
        if ((await availableCopies(tx, input.toUserId, recipient, input.requestedCardId)) < 1) {
            throw new AppError(409, "requested_card_unavailable", "Ten gracz nie ma wolnego egzemplarza tej karty");
        }

        const [trade] = await tx
            .insert(trades)
            .values({
                fromUserId: userId,
                toUserId: input.toUserId,
                offeredCardId: input.offeredCardId,
                requestedCardId: input.requestedCardId,
            })
            .returning({id: trades.id});
        await notify(tx, input.toUserId, "trade_offer", {actorId: userId, tradeId: trade.id});
        return {id: trade.id};
    });
}

/** Takes one copy away. The last copy also leaves the showcase, which can only hold owned cards. */
async function giveCopy(tx: Tx, userId: string, cardId: string) {
    const [row] = await tx
        .select({quantity: userCards.quantity})
        .from(userCards)
        .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)));
    if (!row) throw new Error(`Trade moves a card ${cardId} that player ${userId} does not own`);

    if (row.quantity > 1) {
        await tx
            .update(userCards)
            .set({quantity: sql`${userCards.quantity} - 1`})
            .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)));
        return;
    }
    await tx.delete(showcase).where(and(eq(showcase.userId, userId), eq(showcase.cardId, cardId)));
    await tx.delete(userCards).where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)));
}

/** Adds one copy unless the player is at the limit. Returns whether the copy was lost. */
async function takeCopy(tx: Tx, userId: string, cardId: string): Promise<boolean> {
    const [row] = await tx
        .select({quantity: userCards.quantity})
        .from(userCards)
        .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)));
    const {quantity, lost} = receiveCopy(row?.quantity ?? 0);
    if (lost) return true;
    await tx
        .insert(userCards)
        .values({userId, cardId, quantity})
        .onConflictDoUpdate({target: [userCards.userId, userCards.cardId], set: {quantity}});
    return false;
}

/**
 * Swaps the copies atomically. Both players are locked first, in a fixed order, because every other change to
 * their cards and slots takes the same lock; the offer is locked after them and only then checked.
 */
export async function acceptTrade(db: Db, userId: string, tradeId: number, now = new Date()) {
    return db.transaction(async (tx) => {
        const [known] = await tx.select().from(trades).where(eq(trades.id, tradeId));
        if (!known || known.toUserId !== userId) throw tradeNotFound();

        const [, recipient] = await lockPlayers(tx, known.fromUserId, userId);
        const [trade] = await tx.select().from(trades).where(eq(trades.id, tradeId)).for("update");
        if (!trade || trade.status !== "pending") throw tradeClosed();

        if (!(await areFriends(tx, trade.fromUserId, userId))) throw notFriends();
        if ((await availableCopies(tx, userId, recipient, trade.requestedCardId)) < 1) {
            throw new AppError(
                409,
                "requested_card_unavailable",
                "Nie masz wolnego egzemplarza tej karty. Oferta pozostaje otwarta",
            );
        }

        await giveCopy(tx, trade.fromUserId, trade.offeredCardId);
        await giveCopy(tx, userId, trade.requestedCardId);
        const senderLostCard = await takeCopy(tx, trade.fromUserId, trade.requestedCardId);
        const lostCard = await takeCopy(tx, userId, trade.offeredCardId);

        await tx.update(trades).set({status: "accepted", resolvedAt: now}).where(eq(trades.id, tradeId));
        await notify(tx, trade.fromUserId, "trade_accepted", {
            actorId: userId,
            tradeId,
            lostCard: senderLostCard,
        });

        await evaluateProgress(tx, trade.fromUserId);
        const earned = await evaluateProgress(tx, userId);
        return {lostCard, earned};
    });
}

async function lockPendingTrade(tx: Tx, tradeId: number, isAllowed: (row: TradeRow) => boolean) {
    const [trade] = await tx.select().from(trades).where(eq(trades.id, tradeId)).for("update");
    if (!trade || !isAllowed(trade)) throw tradeNotFound();
    if (trade.status !== "pending") throw tradeClosed();
    return trade;
}

export async function rejectTrade(db: Db, userId: string, tradeId: number, now = new Date()) {
    await db.transaction(async (tx) => {
        const trade = await lockPendingTrade(tx, tradeId, (row) => row.toUserId === userId);
        await tx.update(trades).set({status: "rejected", resolvedAt: now}).where(eq(trades.id, tradeId));
        await notify(tx, trade.fromUserId, "trade_rejected", {actorId: userId, tradeId});
    });
}

export async function cancelTrade(db: Db, userId: string, tradeId: number, now = new Date()) {
    await db.transaction(async (tx) => {
        const trade = await lockPendingTrade(tx, tradeId, (row) => row.fromUserId === userId);
        await tx.update(trades).set({status: "cancelled", resolvedAt: now}).where(eq(trades.id, tradeId));
        await notify(tx, trade.toUserId, "trade_cancelled", {actorId: userId, tradeId});
    });
}
