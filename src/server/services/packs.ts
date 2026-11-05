import {and, asc, count, eq, gt, inArray, sql} from "drizzle-orm";
import {pickDailyPack} from "@/domain/daily-pack";
import {packPrice, type PackTier} from "@/domain/economy";
import {gameDayOf} from "@/domain/game-day";
import {drawPack, type Rng, resolveDrawnCards} from "@/domain/packs";
import {cards, dailyPack, packOpenings, packVouchers, playerState, sets, userCards} from "@/server/db/schema";
import type {Db} from "@/server/db/types";
import {AppError} from "@/server/http/errors";
import {secureRng} from "@/server/rng";
import {evaluateProgress} from "./progress";
import {changeCoins} from "./coins";
import {recordQuestEvent} from "./quests";

/** Set discounted on a game day, chosen once. Concurrent first requests all get the same result. */
export async function ensureDailyPack(db: Db, day: string, rng: Rng = secureRng): Promise<string> {
    const [existing] = await db.select().from(dailyPack).where(eq(dailyPack.gameDay, day));
    if (existing) return existing.setId;

    const candidates = await db.select({id: sets.id, tier: sets.tier}).from(sets);
    const history = await db.select({setId: dailyPack.setId, n: count()}).from(dailyPack).groupBy(dailyPack.setId);
    const chosen = pickDailyPack(
        candidates.map((set) => ({id: set.id, tier: set.tier as PackTier})),
        new Map(history.map((row) => [row.setId, row.n])),
        rng,
    );
    await db.insert(dailyPack).values({gameDay: day, setId: chosen}).onConflictDoNothing();

    const [stored] = await db.select().from(dailyPack).where(eq(dailyPack.gameDay, day));
    return stored.setId;
}

export type ShopSet = {
    id: string;
    name: string;
    logo: string;
    tier: PackTier;
    price: number;
    total: number;
    collected: number;
};

export type ShopView = {
    sets: ShopSet[];
    dailyPack: ShopSet & {regularPrice: number};
    vouchers: Record<PackTier, number>;
    uniqueCards: number;
    catalogCards: number;
};

export async function getShop(db: Db, userId: string, now = new Date()): Promise<ShopView> {
    const dailySetId = await ensureDailyPack(db, gameDayOf(now));

    const [allSets, collected, voucherRows, [{catalogCards}]] = await Promise.all([
        db.select().from(sets).orderBy(asc(sets.name)),
        db
            .select({setId: cards.setId, n: count()})
            .from(userCards)
            .innerJoin(cards, eq(cards.id, userCards.cardId))
            .where(eq(userCards.userId, userId))
            .groupBy(cards.setId),
        db.select().from(packVouchers).where(eq(packVouchers.userId, userId)),
        db.select({catalogCards: count()}).from(cards),
    ]);

    const collectedBySet = new Map(collected.map((row) => [row.setId, row.n]));
    const shopSets: ShopSet[] = allSets.map((set) => ({
        id: set.id,
        name: set.name,
        logo: set.images.logo,
        tier: set.tier as PackTier,
        price: packPrice(set.tier as PackTier, {dailyPack: false}),
        total: set.total,
        collected: collectedBySet.get(set.id) ?? 0,
    }));

    const daily = shopSets.find((set) => set.id === dailySetId);
    if (!daily) throw new Error(`Daily pack set ${dailySetId} is missing from the catalog`);

    const vouchers: Record<PackTier, number> = {1: 0, 2: 0, 3: 0};
    for (const row of voucherRows) vouchers[row.tier as PackTier] = row.quantity;

    return {
        sets: shopSets,
        dailyPack: {...daily, regularPrice: daily.price, price: packPrice(daily.tier, {dailyPack: true})},
        vouchers,
        uniqueCards: collected.reduce((total, row) => total + row.n, 0),
        catalogCards,
    };
}

export type PackSource = "shop" | "daily_pack" | "voucher";

export type OpenedCard = {
    id: string;
    name: string;
    rarity: string;
    income: number;
    imageSmall: string;
    imageLarge: string;
    isNew: boolean;
    overLimit: boolean;
    ownedCopies: number;
};

/**
 * Buys and opens a pack in a single transaction: charge, draw, add to the collection, record the
 * opening, evaluate progress. Either everything happens or nothing does, so the result is safe
 * regardless of what the client does with the animation.
 */
export async function openPack(
    db: Db,
    userId: string,
    input: {setId: string; source: PackSource},
    now = new Date(),
    rng: Rng = secureRng,
) {
    const today = gameDayOf(now);
    // Outside the transaction: choosing the daily pack is not part of the purchase.
    const dailySetId = input.source === "daily_pack" ? await ensureDailyPack(db, today, rng) : null;

    return db.transaction(async (tx) => {
        await tx.select().from(playerState).where(eq(playerState.userId, userId)).for("update");

        const [set] = await tx.select().from(sets).where(eq(sets.id, input.setId));
        if (!set) throw new AppError(404, "set_not_found", "Nie znaleziono paczki");
        const tier = set.tier as PackTier;

        if (input.source === "daily_pack" && set.id !== dailySetId) {
            throw new AppError(409, "not_daily_pack", "Ta paczka nie jest już paczką dnia");
        }

        let price = 0;
        if (input.source === "voucher") {
            const [voucher] = await tx
                .update(packVouchers)
                .set({quantity: sql`${packVouchers.quantity} - 1`})
                .where(and(eq(packVouchers.userId, userId), eq(packVouchers.tier, tier), gt(packVouchers.quantity, 0)))
                .returning();
            if (!voucher) throw new AppError(409, "no_voucher", "Nie masz darmowej paczki tego poziomu");
        } else {
            price = packPrice(tier, {dailyPack: input.source === "daily_pack"});
            await changeCoins(tx, userId, -price, "pack_purchase", set.id);
        }

        const setCards = await tx.select().from(cards).where(eq(cards.setId, set.id));
        const pack = drawPack(setCards, tier, rng);
        const drawnIds = pack.cards.map((card) => card.id);

        const ownedRows = await tx
            .select({cardId: userCards.cardId, quantity: userCards.quantity})
            .from(userCards)
            .where(and(eq(userCards.userId, userId), inArray(userCards.cardId, drawnIds)));
        const owned = new Map(ownedRows.map((row) => [row.cardId, row.quantity]));
        const resolved = resolveDrawnCards(drawnIds, owned);

        const added = new Map<string, number>();
        for (const card of resolved) {
            if (!card.overLimit) added.set(card.cardId, (added.get(card.cardId) ?? 0) + 1);
        }
        for (const [cardId, quantity] of added) {
            await tx
                .insert(userCards)
                .values({userId, cardId, quantity})
                .onConflictDoUpdate({
                    target: [userCards.userId, userCards.cardId],
                    set: {quantity: sql`${userCards.quantity} + ${quantity}`},
                });
        }

        const [opening] = await tx
            .insert(packOpenings)
            .values({userId, setId: set.id, source: input.source, price, cards: resolved, isGodPack: pack.isGodPack})
            .returning({id: packOpenings.id});

        await recordQuestEvent(tx, userId, today, {
            kind: "pack_opened",
            source: input.source,
            cards: pack.cards.map((card, index) => ({rarity: card.rarity, isNew: resolved[index].isNew})),
        });

        const earned = await evaluateProgress(tx, userId);
        const [state] = await tx
            .select({coins: playerState.coins})
            .from(playerState)
            .where(eq(playerState.userId, userId));

        const openedCards: OpenedCard[] = pack.cards.map((card, index) => ({
            id: card.id,
            name: card.name,
            rarity: card.rarity,
            income: card.income,
            imageSmall: card.images.small,
            imageLarge: card.images.large,
            isNew: resolved[index].isNew,
            overLimit: resolved[index].overLimit,
            ownedCopies: (owned.get(card.id) ?? 0) + (added.get(card.id) ?? 0),
        }));

        return {
            openingId: opening.id,
            isGodPack: pack.isGodPack,
            coins: state.coins,
            set: {id: set.id, name: set.name, logo: set.images.logo},
            cards: openedCards,
            earned,
        };
    });
}
