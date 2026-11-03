import {and, eq} from "drizzle-orm";
import {beforeAll, afterAll, describe, expect, it} from "vitest";
import {
    cards,
    coinLedger,
    dailyPack,
    packOpenings,
    packVouchers,
    playerState,
    trades,
    userAchievements,
    userBadges,
    userCards,
    users,
} from "@/server/db/schema";
import {getStatistics, getSetCollection, listCollectionSets} from "@/server/services/collection";
import {ensureDailyPack, getShop, openPack} from "@/server/services/packs";
import {claimAchievement, listAchievements} from "@/server/services/progress";
import {claimDailyReward, collectPiggyBank, getPlayerSummary, setIncomeSlot} from "@/server/services/wallet";
import {createTestDb, type TestDb} from "../helpers/db";
import {seededRng} from "../helpers/rng";

let t: TestDb;

beforeAll(async () => {
    t = await createTestDb();
});

afterAll(async () => {
    await t.close();
});

let counter = 0;
async function newPlayer(coins = 500) {
    const name = `player_${++counter}`;
    const [user] = await t.db
        .insert(users)
        .values({username: name, email: `${name}@example.com`, passwordHash: "x"})
        .returning();
    await t.db.insert(playerState).values({userId: user.id, coins, piggyLastCollectedAt: START});
    return user.id;
}

async function coinsOf(userId: string) {
    const [state] = await t.db.select().from(playerState).where(eq(playerState.userId, userId));
    return state.coins;
}

async function firstCardOfRarity(rarity: (typeof cards.$inferSelect)["rarity"]) {
    const [card] = await t.db.select().from(cards).where(eq(cards.rarity, rarity)).limit(1);
    return card;
}

async function give(userId: string, cardId: string, quantity = 1) {
    await t.db.insert(userCards).values({userId, cardId, quantity});
}

async function expectConflict(promise: Promise<unknown>, code: string) {
    await expect(promise).rejects.toMatchObject({status: 409, code});
}

const START = new Date("2026-11-03T12:00:00Z");
const hoursAfterStart = (hours: number) => new Date(START.getTime() + hours * 3_600_000);
const DAY = 24;

describe("daily reward", () => {
    it("pays the streak ladder once per game day", async () => {
        const id = await newPlayer(0);
        expect(await claimDailyReward(t.db, id, START)).toMatchObject({reward: 100, streakDay: 1, coins: 100});
        await expectConflict(claimDailyReward(t.db, id, hoursAfterStart(1)), "already_claimed");
        expect(await claimDailyReward(t.db, id, hoursAfterStart(DAY))).toMatchObject({reward: 120, streakDay: 2});
        expect(await coinsOf(id)).toBe(220);
    });

    it("switches at 10:00 Warsaw time, not at midnight", async () => {
        const id = await newPlayer(0);
        // 09:30 CET on Nov 4 still belongs to the game day of Nov 3.
        await claimDailyReward(t.db, id, new Date("2026-11-03T12:00:00Z"));
        await expectConflict(claimDailyReward(t.db, id, new Date("2026-11-04T08:30:00Z")), "already_claimed");
        await claimDailyReward(t.db, id, new Date("2026-11-04T09:00:00Z"));
    });

    it("gives a single reward for parallel requests", async () => {
        const id = await newPlayer(0);
        const results = await Promise.allSettled([
            claimDailyReward(t.db, id, START),
            claimDailyReward(t.db, id, START),
        ]);
        expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
        expect(await coinsOf(id)).toBe(100);
    });

    it("restarts the streak after a missed day and caps it at day 7", async () => {
        const id = await newPlayer(0);
        for (let day = 0; day < 8; day++) await claimDailyReward(t.db, id, hoursAfterStart(DAY * day));
        const summary = await getPlayerSummary(t.db, id, hoursAfterStart(DAY * 8));
        expect(summary.daily).toEqual({claimable: true, streakDay: 7, reward: 250});
        const afterGap = await claimDailyReward(t.db, id, hoursAfterStart(DAY * 10));
        expect(afterGap).toMatchObject({streakDay: 1, reward: 100});
    });
});

describe("opening packs", () => {
    it("charges the tier price, adds five cards and records the opening", async () => {
        const id = await newPlayer();
        const opened = await openPack(t.db, id, {setId: "sv1", source: "shop"}, START, seededRng(1));

        expect(opened.cards).toHaveLength(5);
        expect(opened.coins).toBe(350);
        const copies = await t.db.select().from(userCards).where(eq(userCards.userId, id));
        expect(copies.reduce((sum, row) => sum + row.quantity, 0)).toBe(5);
        expect(await t.db.select().from(packOpenings).where(eq(packOpenings.userId, id))).toHaveLength(1);
        expect(await t.db.select().from(coinLedger).where(eq(coinLedger.userId, id))).toMatchObject([
            {amount: -150, reason: "pack_purchase", refId: "sv1"},
        ]);
    });

    it("prices sets by tier", async () => {
        const shop = await getShop(t.db, await newPlayer(), START);
        const prices = Object.fromEntries(shop.sets.map((set) => [set.id, set.price]));
        expect(prices.sv1).toBe(150);
        expect(prices.sv9).toBe(250);
        expect(prices.sv3pt5).toBe(400);
    });

    it("rejects a purchase without enough coins and changes nothing", async () => {
        const id = await newPlayer(149);
        await expectConflict(openPack(t.db, id, {setId: "sv1", source: "shop"}, START), "not_enough_coins");
        expect(await coinsOf(id)).toBe(149);
        expect(await t.db.select().from(userCards).where(eq(userCards.userId, id))).toEqual([]);
    });

    it("rolls back the charge when anything fails after it", async () => {
        const id = await newPlayer();
        const failingRng = () => {
            throw new Error("draw failed");
        };
        await expect(openPack(t.db, id, {setId: "sv1", source: "shop"}, START, failingRng)).rejects.toThrow();
        expect(await coinsOf(id)).toBe(500);
        expect(await t.db.select().from(coinLedger).where(eq(coinLedger.userId, id))).toEqual([]);
    });

    it("rejects an unknown set", async () => {
        await expect(openPack(t.db, await newPlayer(), {setId: "nope", source: "shop"}, START)).rejects.toMatchObject({
            status: 404,
        });
    });

    it("keeps copies at 9 and marks the excess as over limit, still charging", async () => {
        const id = await newPlayer();
        const setCards = await t.db.select().from(cards).where(eq(cards.setId, "sv6pt5"));
        await t.db.insert(userCards).values(setCards.map((card) => ({userId: id, cardId: card.id, quantity: 9})));

        const opened = await openPack(t.db, id, {setId: "sv6pt5", source: "shop"}, START, seededRng(2));

        expect(opened.cards.every((card) => card.overLimit && !card.isNew && card.ownedCopies === 9)).toBe(true);
        expect(opened.coins).toBe(100);
        const rows = await t.db.select().from(userCards).where(eq(userCards.userId, id));
        expect(rows.every((row) => row.quantity === 9)).toBe(true);
    });

    it("marks new cards and counts copies", async () => {
        const opened = await openPack(t.db, await newPlayer(), {setId: "sv1", source: "shop"}, START, seededRng(3));
        const firstOfEach = new Set<string>();
        for (const card of opened.cards) {
            expect(card.isNew).toBe(!firstOfEach.has(card.id));
            firstOfEach.add(card.id);
        }
    });

    it("sells the daily pack at a discount, only for today's set", async () => {
        const id = await newPlayer();
        const setId = await ensureDailyPack(t.db, "2026-11-03");
        const shop = await getShop(t.db, id, START);
        expect(shop.dailyPack.id).toBe(setId);
        expect(shop.dailyPack.price).toBe(Math.round(shop.dailyPack.regularPrice * 0.7));

        const opened = await openPack(t.db, id, {setId, source: "daily_pack"}, START, seededRng(4));
        expect(opened.coins).toBe(500 - shop.dailyPack.price);

        const otherSet = setId === "sv1" ? "sv2" : "sv1";
        await expectConflict(
            openPack(t.db, id, {setId: otherSet, source: "daily_pack"}, START, seededRng(5)),
            "not_daily_pack",
        );
    });

    it("opens a free pack only with a voucher of the set's tier", async () => {
        const id = await newPlayer(0);
        await expectConflict(openPack(t.db, id, {setId: "sv3pt5", source: "voucher"}, START), "no_voucher");

        await t.db.insert(packVouchers).values({userId: id, tier: 3, quantity: 1});
        await expectConflict(openPack(t.db, id, {setId: "sv1", source: "voucher"}, START), "no_voucher");

        const opened = await openPack(t.db, id, {setId: "sv3pt5", source: "voucher"}, START, seededRng(6));
        expect(opened.coins).toBe(0);
        const [voucher] = await t.db.select().from(packVouchers).where(eq(packVouchers.userId, id));
        expect(voucher.quantity).toBe(0);
    });
});

describe("daily pack selection", () => {
    it("stays the same for the whole game day and survives parallel first requests", async () => {
        const day = "2030-01-01";
        const results = await Promise.all([
            ensureDailyPack(t.db, day, seededRng(1)),
            ensureDailyPack(t.db, day, seededRng(2)),
            ensureDailyPack(t.db, day, seededRng(3)),
        ]);
        expect(new Set(results).size).toBe(1);
        expect(await t.db.select().from(dailyPack).where(eq(dailyPack.gameDay, day))).toHaveLength(1);
    });
});

describe("income slots and piggy bank", () => {
    it("only accepts cards the player has a free copy of", async () => {
        const id = await newPlayer();
        const card = await firstCardOfRarity("rare");
        await expectConflict(setIncomeSlot(t.db, id, 1, card.id, START), "card_unavailable");

        await give(id, card.id);
        await setIncomeSlot(t.db, id, 1, card.id, START);
        await expectConflict(setIncomeSlot(t.db, id, 2, card.id, START), "card_unavailable");
    });

    it("allows the same card in both slots with two copies", async () => {
        const id = await newPlayer();
        const card = await firstCardOfRarity("rare");
        await give(id, card.id, 2);
        await setIncomeSlot(t.db, id, 1, card.id, START);
        await setIncomeSlot(t.db, id, 2, card.id, START);
        const summary = await getPlayerSummary(t.db, id, START);
        expect(summary.piggyBank.incomePerHour).toBe(card.income * 2);
    });

    it("does not treat a copy held in an open trade as free", async () => {
        const id = await newPlayer();
        const friend = await newPlayer();
        const card = await firstCardOfRarity("rare");
        await give(id, card.id);
        await t.db
            .insert(trades)
            .values({fromUserId: id, toUserId: friend, offeredCardId: card.id, requestedCardId: card.id});
        await expectConflict(setIncomeSlot(t.db, id, 1, card.id, START), "card_unavailable");
    });

    it("fills the piggy bank at the income rate up to its capacity", async () => {
        const id = await newPlayer(0);
        const card = await firstCardOfRarity("secret rare");
        await give(id, card.id);
        await setIncomeSlot(t.db, id, 1, card.id, START);

        const afterTwoHours = await getPlayerSummary(t.db, id, hoursAfterStart(2));
        expect(afterTwoHours.piggyBank.balance).toBe(50);
        expect(afterTwoHours.coins).toBe(0);

        const afterHalfYear = await getPlayerSummary(t.db, id, hoursAfterStart(DAY * 180));
        expect(afterHalfYear.piggyBank.balance).toBe(300);

        expect(await collectPiggyBank(t.db, id, hoursAfterStart(DAY * 180))).toEqual({collected: 300});
        expect(await coinsOf(id)).toBe(300);
        await expectConflict(collectPiggyBank(t.db, id, hoursAfterStart(DAY * 180)), "piggy_bank_empty");
    });

    it("does not count time before the card was slotted", async () => {
        const id = await newPlayer(0);
        const card = await firstCardOfRarity("rare");
        await give(id, card.id);
        await setIncomeSlot(t.db, id, 1, card.id, hoursAfterStart(100));
        const summary = await getPlayerSummary(t.db, id, hoursAfterStart(100));
        expect(summary.piggyBank.balance).toBe(0);
    });

    it("pays out earnings at the old rate when the card changes", async () => {
        const id = await newPlayer(0);
        const [cheap, rich] = [await firstCardOfRarity("common"), await firstCardOfRarity("secret rare")];
        await give(id, cheap.id);
        await give(id, rich.id);
        await setIncomeSlot(t.db, id, 1, cheap.id, START);

        const changed = await setIncomeSlot(t.db, id, 1, rich.id, hoursAfterStart(10));
        expect(changed.collected).toBe(cheap.income * 10);
        expect(await coinsOf(id)).toBe(cheap.income * 10);

        const summary = await getPlayerSummary(t.db, id, hoursAfterStart(10));
        expect(summary.piggyBank.balance).toBe(0);
    });

    it("empties a slot", async () => {
        const id = await newPlayer();
        const card = await firstCardOfRarity("rare");
        await give(id, card.id);
        await setIncomeSlot(t.db, id, 2, card.id, START);
        await setIncomeSlot(t.db, id, 2, null, START);
        const summary = await getPlayerSummary(t.db, id, START);
        expect(summary.slots.slot2CardId).toBeNull();
        expect(summary.piggyBank.incomePerHour).toBe(0);
    });
});

describe("achievements and badges", () => {
    it("unlocks achievements on the server when a pack is opened", async () => {
        const id = await newPlayer();
        const opened = await openPack(t.db, id, {setId: "sv1", source: "shop"}, START, seededRng(7));
        const titles = opened.earned.achievements.map((achievement) => achievement.id);
        expect(titles).toContain(1); // first unique card
        expect(titles).toContain(15); // first pack

        const summary = await getPlayerSummary(t.db, id, START);
        expect(summary.hasUnclaimedAchievements).toBe(true);
    });

    it("pays a coin reward exactly once", async () => {
        const id = await newPlayer(0);
        await t.db.insert(userAchievements).values({userId: id, achievementId: 1});

        await claimAchievement(t.db, id, 1, START);
        expect(await coinsOf(id)).toBe(50);

        await expectConflict(claimAchievement(t.db, id, 1, START), "cannot_claim");
        expect(await coinsOf(id)).toBe(50);
    });

    it("pays once under parallel claims", async () => {
        const id = await newPlayer(0);
        await t.db.insert(userAchievements).values({userId: id, achievementId: 1});
        const results = await Promise.allSettled([
            claimAchievement(t.db, id, 1, START),
            claimAchievement(t.db, id, 1, START),
        ]);
        expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
        expect(await coinsOf(id)).toBe(50);
    });

    it("refuses to pay for a locked achievement", async () => {
        const id = await newPlayer(0);
        await expectConflict(claimAchievement(t.db, id, 1, START), "cannot_claim");
        expect(await coinsOf(id)).toBe(0);
    });

    it("grants pack vouchers for large rewards", async () => {
        const id = await newPlayer(0);
        await t.db.insert(userAchievements).values({userId: id, achievementId: 7}); // 1500 coins before
        await claimAchievement(t.db, id, 7, START);

        expect(await coinsOf(id)).toBe(0);
        const [voucher] = await t.db
            .select()
            .from(packVouchers)
            .where(and(eq(packVouchers.userId, id), eq(packVouchers.tier, 3)));
        expect(voucher.quantity).toBe(4);
    });

    it("lists achievements sorted from common to epic, with player state", async () => {
        const id = await newPlayer();
        await t.db.insert(userAchievements).values({userId: id, achievementId: 1});
        const list = await listAchievements(t.db, id);
        const order = {common: 0, rare: 1, epic: 2};
        for (let i = 1; i < list.length; i++) {
            expect(order[list[i - 1].rarity]).toBeLessThanOrEqual(order[list[i].rarity]);
        }
        expect(list.find((achievement) => achievement.id === 1)).toMatchObject({unlocked: true, claimed: false});
        expect(list.filter((achievement) => achievement.unlocked)).toHaveLength(1);
    });

    it("awards the income badge when slots reach the required income", async () => {
        const id = await newPlayer();
        const [secret, hyper] = [await firstCardOfRarity("secret rare"), await firstCardOfRarity("hyper rare")];
        await give(id, secret.id);
        await give(id, hyper.id);
        await setIncomeSlot(t.db, id, 1, secret.id, START);
        const second = await setIncomeSlot(t.db, id, 2, hyper.id, START);

        expect(second.earned.badges.map((badge) => badge.id)).toContain(3);
        const stored = await t.db.select().from(userBadges).where(eq(userBadges.userId, id));
        expect(stored.map((badge) => badge.badgeId)).toContain(3);
    });
});

describe("collection and statistics", () => {
    it("reports progress per set by unique cards", async () => {
        const id = await newPlayer();
        const [first, second] = await t.db.select().from(cards).where(eq(cards.setId, "sv2")).limit(2);
        await give(id, first.id, 3);
        await give(id, second.id);

        const sets = await listCollectionSets(t.db, id);
        expect(sets.find((set) => set.id === "sv2")?.collected).toBe(2);
        expect(sets.find((set) => set.id === "sv1")?.collected).toBe(0);
    });

    it("lists every card of a set with owned quantities, only for this player", async () => {
        const id = await newPlayer();
        const other = await newPlayer();
        const [card] = await t.db.select().from(cards).where(eq(cards.setId, "sv2")).limit(1);
        await give(id, card.id, 3);

        const {cards: list} = await getSetCollection(t.db, id, "sv2");
        expect(list.length).toBeGreaterThan(100);
        expect(list.find((entry) => entry.id === card.id)?.quantity).toBe(3);
        expect(list.filter((entry) => entry.quantity > 0)).toHaveLength(1);

        const {cards: otherList} = await getSetCollection(t.db, other, "sv2");
        expect(otherList.filter((entry) => entry.quantity > 0)).toEqual([]);
    });

    it("computes statistics from actual data", async () => {
        const id = await newPlayer(2000);
        await openPack(t.db, id, {setId: "sv1", source: "shop"}, START, seededRng(8));
        await openPack(t.db, id, {setId: "sv1", source: "shop"}, START, seededRng(9));

        const stats = await getStatistics(t.db, id);
        expect(stats.totalCards).toBe(10);
        expect(stats.packsOpened).toBe(2);
        expect(stats.duplicates).toBe(stats.totalCards - stats.uniqueCards);
        expect(stats.catalogCards).toBe(3169);
        expect(stats.favoriteSet).toMatchObject({opened: 2});
        expect(stats.bestCard).not.toBeNull();
        expect(stats.badges).toHaveLength(9);
        expect(stats.achievementsTotal).toBe(34);
        expect(Object.values(stats.copiesByRarity).reduce((sum, n) => sum + n, 0)).toBe(10);
    });

    it("handles a player with no cards", async () => {
        const stats = await getStatistics(t.db, await newPlayer());
        expect(stats).toMatchObject({totalCards: 0, uniqueCards: 0, favoriteSet: null, bestCard: null});
    });
});
