import {and, eq} from "drizzle-orm";
import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {MINIGAME_REWARDS, QUEST_REWARD} from "@/domain/economy";
import {addDays, gameDayOf} from "@/domain/game-day";
import type {MinigameState} from "@/domain/minigames";
import type {MemoryState} from "@/domain/minigames/memory";
import {solvedTiles} from "@/domain/minigames/sliding-puzzle";
import type {WhoIsItState} from "@/domain/minigames/who-is-it";
import {
    coinLedger,
    dailyQuests,
    minigameAttempts,
    minigameDays,
    playerState,
    sets,
    userCards,
    users,
} from "@/server/db/schema";
import {deleteAccount} from "@/server/services/account";
import {ensureMinigameDay, getCurrentClue, getMinigame, playMinigame, startMinigame} from "@/server/services/minigames";
import {ensureDailyPack, openPack} from "@/server/services/packs";
import {claimQuest, getQuests} from "@/server/services/quests";
import {collectPiggyBank, setIncomeSlot} from "@/server/services/wallet";
import {hashPassword} from "@/server/auth/password";
import {cards} from "@/server/db/schema";
import {createTestDb, type TestDb} from "../helpers/db";
import {seededRng} from "../helpers/rng";

// A separate game day for each describe block's variant would be needless: the variant is set per test day.
const NOW = new Date("2026-06-10T12:00:00+02:00");
const DAY = gameDayOf(NOW);

let t: TestDb;

beforeAll(async () => {
    t = await createTestDb();
});

afterAll(async () => {
    await t.close();
});

let counter = 0;
async function newPlayer(coins = 5000) {
    const name = `daily_${++counter}`;
    const [user] = await t.db
        .insert(users)
        .values({username: name, email: `${name}@example.com`, passwordHash: await hashPassword("password123")})
        .returning();
    await t.db
        .insert(playerState)
        .values({userId: user.id, coins, piggyLastCollectedAt: new Date(NOW.getTime() - 36e5)});
    return user.id;
}

async function coinsOf(userId: string) {
    const [state] = await t.db.select().from(playerState).where(eq(playerState.userId, userId));
    return state.coins;
}

let dayOffset = 100;
/** A new game day with a chosen variant, so tests of different games do not share one. */
async function dayWith(game: "who_is_it" | "memory" | "sliding_puzzle", difficulty: "easy" | "medium" | "hard") {
    const now = new Date(NOW.getTime() + ++dayOffset * 24 * 36e5);
    await t.db.insert(minigameDays).values({gameDay: gameDayOf(now), game, difficulty, payload: {}});
    return now;
}

async function stateOf<T extends MinigameState>(userId: string, now: Date) {
    const [attempt] = await t.db
        .select()
        .from(minigameAttempts)
        .where(and(eq(minigameAttempts.userId, userId), eq(minigameAttempts.gameDay, gameDayOf(now))));
    return attempt.state as T;
}

/** Puts chosen quests on a player's day. */
async function setQuests(userId: string, now: Date, quests: {type: string; target: number}[]) {
    await t.db.insert(dailyQuests).values(
        quests.map((quest, index) => ({
            userId,
            gameDay: gameDayOf(now),
            slot: index + 1,
            questType: quest.type,
            target: quest.target,
        })),
    );
}

const expectConflict = (promise: Promise<unknown>, code: string) =>
    expect(promise).rejects.toMatchObject({status: 409, code});

describe("daily quests", () => {
    it("draws three quests once a day", async () => {
        const player = await newPlayer();
        const first = await getQuests(t.db, player, NOW, seededRng(1));
        const second = await getQuests(t.db, player, NOW, seededRng(2));
        expect(first).toHaveLength(3);
        expect(second).toEqual(first);
        expect(first.every((quest) => quest.reward === QUEST_REWARD)).toBe(true);
    });

    it("gives each player their own draw, and new quests on the next game day", async () => {
        const player = await newPlayer();
        await getQuests(t.db, player, NOW, seededRng(1));
        const nextDay = await getQuests(t.db, player, new Date(NOW.getTime() + 24 * 36e5), seededRng(5));
        expect(nextDay.every((quest) => quest.progress === 0 && !quest.claimed)).toBe(true);
        const rows = await t.db.select().from(dailyQuests).where(eq(dailyQuests.userId, player));
        expect(rows).toHaveLength(6);
    });

    it("moves to a new day at 10:00 Polish time, not at midnight", async () => {
        const player = await newPlayer();
        await getQuests(t.db, player, new Date("2026-06-10T09:59:00+02:00"), seededRng(1));
        await getQuests(t.db, player, new Date("2026-06-10T00:30:00+02:00"), seededRng(2));
        expect(await t.db.select().from(dailyQuests).where(eq(dailyQuests.userId, player))).toHaveLength(3);
        await getQuests(t.db, player, new Date("2026-06-10T10:00:00+02:00"), seededRng(3));
        expect(await t.db.select().from(dailyQuests).where(eq(dailyQuests.userId, player))).toHaveLength(6);
    });

    it("counts packs, also before the player has seen the quests", async () => {
        const player = await newPlayer();
        const [set] = await t.db.select().from(sets).limit(1);
        await openPack(t.db, player, {setId: set.id, source: "shop"}, NOW);
        const rows = await t.db.select().from(dailyQuests).where(eq(dailyQuests.userId, player));
        expect(rows).toHaveLength(3);
    });

    it("counts an opened pack for the matching quests", async () => {
        const player = await newPlayer();
        await setQuests(player, NOW, [
            {type: "open_packs", target: 2},
            {type: "new_cards", target: 3},
            {type: "collect_piggy", target: 1},
        ]);
        const [set] = await t.db.select().from(sets).limit(1);
        await openPack(t.db, player, {setId: set.id, source: "shop"}, NOW, seededRng(1));

        const quests = await getQuests(t.db, player, NOW);
        expect(quests[0].progress).toBe(1);
        expect(quests[1].progress).toBe(3);
        expect(quests[2].progress).toBe(0);
    });

    it("counts the daily pack only when it is the daily pack", async () => {
        const player = await newPlayer();
        await setQuests(player, NOW, [{type: "open_daily_pack", target: 1}]);
        const dailySetId = await ensureDailyPack(t.db, DAY, seededRng(1));
        await openPack(t.db, player, {setId: dailySetId, source: "shop"}, NOW);
        expect((await getQuests(t.db, player, NOW))[0].progress).toBe(0);
        await openPack(t.db, player, {setId: dailySetId, source: "daily_pack"}, NOW);
        expect((await getQuests(t.db, player, NOW))[0].progress).toBe(1);
    });

    it("counts collecting the piggy bank, but not an empty one", async () => {
        const player = await newPlayer();
        await setQuests(player, NOW, [{type: "collect_piggy", target: 1}]);
        await expectConflict(collectPiggyBank(t.db, player, NOW), "piggy_bank_empty");
        expect((await getQuests(t.db, player, NOW))[0].progress).toBe(0);

        const [card] = await t.db.select().from(cards).limit(1);
        await t.db.insert(userCards).values({userId: player, cardId: card.id, quantity: 1});
        await setIncomeSlot(t.db, player, 1, card.id, new Date(NOW.getTime() - 5 * 36e5));
        await collectPiggyBank(t.db, player, NOW);
        expect((await getQuests(t.db, player, NOW))[0].progress).toBe(1);
    });

    it("does not count a slot change as collecting the piggy bank", async () => {
        const player = await newPlayer();
        await setQuests(player, NOW, [{type: "collect_piggy", target: 1}]);
        const [first, second] = await t.db.select().from(cards).limit(2);
        await t.db.insert(userCards).values([
            {userId: player, cardId: first.id, quantity: 1},
            {userId: player, cardId: second.id, quantity: 1},
        ]);
        await setIncomeSlot(t.db, player, 1, first.id, new Date(NOW.getTime() - 5 * 36e5));
        await setIncomeSlot(t.db, player, 1, second.id, NOW);
        expect((await getQuests(t.db, player, NOW))[0].progress).toBe(0);
    });

    it("never goes past the target", async () => {
        const player = await newPlayer();
        await setQuests(player, NOW, [{type: "new_cards", target: 3}]);
        const [set] = await t.db.select().from(sets).limit(1);
        await openPack(t.db, player, {setId: set.id, source: "shop"}, NOW, seededRng(1));
        await openPack(t.db, player, {setId: set.id, source: "shop"}, NOW, seededRng(2));
        expect((await getQuests(t.db, player, NOW))[0].progress).toBe(3);
    });

    it("pays a finished quest exactly once and records it", async () => {
        const player = await newPlayer(1000);
        await setQuests(player, NOW, [{type: "finish_minigame", target: 1}]);
        await t.db.update(dailyQuests).set({progress: 1}).where(eq(dailyQuests.userId, player));

        const {coins, reward} = await claimQuest(t.db, player, 1, NOW);
        expect(reward).toBe(QUEST_REWARD);
        expect(coins).toBe(1000 + QUEST_REWARD);
        await expectConflict(claimQuest(t.db, player, 1, NOW), "cannot_claim");
        expect(await coinsOf(player)).toBe(1000 + QUEST_REWARD);
        expect((await getQuests(t.db, player, NOW))[0].claimed).toBe(true);

        const ledger = await t.db.select().from(coinLedger).where(eq(coinLedger.userId, player));
        expect(ledger).toHaveLength(1);
        expect(ledger[0]).toMatchObject({reason: "quest", amount: QUEST_REWARD, refId: `${DAY}:1`});
    });

    it("pays once when two claims race", async () => {
        const player = await newPlayer(1000);
        await setQuests(player, NOW, [{type: "finish_minigame", target: 1}]);
        await t.db.update(dailyQuests).set({progress: 1}).where(eq(dailyQuests.userId, player));
        const results = await Promise.allSettled([claimQuest(t.db, player, 1, NOW), claimQuest(t.db, player, 1, NOW)]);
        expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
        expect(await coinsOf(player)).toBe(1000 + QUEST_REWARD);
    });

    it("refuses an unfinished quest, a missing one and another player's", async () => {
        const player = await newPlayer(1000);
        const other = await newPlayer(1000);
        await setQuests(player, NOW, [{type: "open_packs", target: 2}]);
        await expectConflict(claimQuest(t.db, player, 1, NOW), "cannot_claim");
        await expectConflict(claimQuest(t.db, player, 3, NOW), "cannot_claim");
        await t.db.update(dailyQuests).set({progress: 2}).where(eq(dailyQuests.userId, player));
        await expectConflict(claimQuest(t.db, other, 1, NOW), "cannot_claim");
        expect(await coinsOf(other)).toBe(1000);
    });

    it("lets an unclaimed reward expire when the game day changes", async () => {
        const player = await newPlayer(1000);
        await setQuests(player, NOW, [{type: "finish_minigame", target: 1}]);
        await t.db.update(dailyQuests).set({progress: 1}).where(eq(dailyQuests.userId, player));
        const tomorrow = new Date(NOW.getTime() + 24 * 36e5);
        await expectConflict(claimQuest(t.db, player, 1, tomorrow), "cannot_claim");
        expect(await coinsOf(player)).toBe(1000);
    });
});

describe("the day's minigame", () => {
    it("chooses one variant per game day, shared by all players", async () => {
        const now = new Date(NOW.getTime() + 50 * 24 * 36e5);
        const a = await getMinigame(t.db, await newPlayer(), now, seededRng(1));
        const b = await getMinigame(t.db, await newPlayer(), now, seededRng(2));
        expect({game: b.game, difficulty: b.difficulty}).toEqual({game: a.game, difficulty: a.difficulty});
        expect(a.status).toBe("not_started");
        expect(a.view).toBeNull();
        expect(a.reward).toBe(MINIGAME_REWARDS[a.difficulty]);
    });

    it("does not repeat yesterday's variant", async () => {
        const base = new Date(NOW.getTime() + 60 * 24 * 36e5);
        let previous = await ensureMinigameDay(t.db, gameDayOf(base), seededRng(1));
        for (let i = 1; i <= 10; i++) {
            const day = addDays(gameDayOf(base), i);
            const variant = await ensureMinigameDay(t.db, day, seededRng(i));
            expect(variant).not.toEqual(previous);
            previous = variant;
        }
    });

    it("keeps one attempt: starting again returns the running game", async () => {
        const now = await dayWith("memory", "easy");
        const player = await newPlayer();
        await startMinigame(t.db, player, now);
        const before = await stateOf<MemoryState>(player, now);
        await playMinigame(t.db, player, {type: "flip", position: 0}, now);
        const again = await startMinigame(t.db, player, now);
        expect(again.status).toBe("in_progress");
        const after = await stateOf<MemoryState>(player, now);
        expect(after.deck).toEqual(before.deck);
        expect(after.open).toEqual([0]);
    });

    it("keeps the game after a refresh", async () => {
        const now = await dayWith("memory", "medium");
        const player = await newPlayer();
        await startMinigame(t.db, player, now);
        await playMinigame(t.db, player, {type: "flip", position: 3}, now);
        const view = await getMinigame(t.db, player, now);
        expect(view.status).toBe("in_progress");
        expect(view.view).toMatchObject({game: "memory"});
        expect((view.view as {positions: {status: string}[]}).positions[3].status).toBe("open");
    });

    it("gives each player different cards, so answers cannot be passed on", async () => {
        const now = await dayWith("who_is_it", "easy");
        const a = await newPlayer();
        const b = await newPlayer();
        await startMinigame(t.db, a, now);
        await startMinigame(t.db, b, now);
        const cardsOf = async (player: string) =>
            (await stateOf<WhoIsItState>(player, now)).rounds.map((round) => round.cardId);
        expect(await cardsOf(a)).not.toEqual(await cardsOf(b));
    });

    it("refuses moves before the start", async () => {
        const now = await dayWith("memory", "easy");
        await expectConflict(
            playMinigame(t.db, await newPlayer(), {type: "flip", position: 0}, now),
            "minigame_not_started",
        );
    });

    it("refuses an illegal move, leaving the game unchanged", async () => {
        const now = await dayWith("memory", "easy");
        const player = await newPlayer();
        await startMinigame(t.db, player, now);
        await expectConflict(playMinigame(t.db, player, {type: "flip", position: 25}, now), "illegal_move");
        await expectConflict(playMinigame(t.db, player, {type: "answer", answer: "x"}, now), "illegal_move");
        expect((await stateOf<MemoryState>(player, now)).open).toEqual([]);
    });

    it("does not carry yesterday's game into a new day", async () => {
        const now = await dayWith("memory", "easy");
        const player = await newPlayer();
        await startMinigame(t.db, player, now);
        const tomorrow = await dayWith("memory", "hard");
        expect((await getMinigame(t.db, player, tomorrow)).status).toBe("not_started");
    });

    it("counts finishing the game for the quest, and a lost game too", async () => {
        const now = await dayWith("who_is_it", "hard");
        const player = await newPlayer(1000);
        await setQuests(player, now, [{type: "finish_minigame", target: 1}]);
        await startMinigame(t.db, player, now);
        for (let round = 0; round < 5; round++) {
            await playMinigame(t.db, player, {type: "answer", answer: "zzzzzzzzzz"}, now);
        }
        expect((await getMinigame(t.db, player, now)).status).toBe("lost");
        expect((await getQuests(t.db, player, now))[0].progress).toBe(1);
        expect(await coinsOf(player)).toBe(1000);
    });

    it("does not count a game still being played", async () => {
        const now = await dayWith("memory", "easy");
        const player = await newPlayer();
        await setQuests(player, now, [{type: "finish_minigame", target: 1}]);
        await startMinigame(t.db, player, now);
        await playMinigame(t.db, player, {type: "flip", position: 0}, now);
        expect((await getQuests(t.db, player, now))[0].progress).toBe(0);
    });

    it("deletes attempts and quests together with the account", async () => {
        const now = await dayWith("memory", "easy");
        const player = await newPlayer();
        await startMinigame(t.db, player, now);
        await getQuests(t.db, player, now);
        await deleteAccount(t.db, player, "password123");
        expect(await t.db.select().from(minigameAttempts).where(eq(minigameAttempts.userId, player))).toEqual([]);
        expect(await t.db.select().from(dailyQuests).where(eq(dailyQuests.userId, player))).toEqual([]);
    });
});

describe("Kto to Pokémon on the server", () => {
    it("pays the reward for 3 of 5, once", async () => {
        const now = await dayWith("who_is_it", "easy");
        const player = await newPlayer(1000);
        await startMinigame(t.db, player, now);
        const {rounds} = await stateOf<WhoIsItState>(player, now);

        for (const [index, round] of rounds.entries()) {
            const wrong = round.options!.find((option) => option !== round.name)!;
            await playMinigame(t.db, player, {type: "answer", answer: index < 3 ? round.name : wrong}, now);
        }

        const today = await getMinigame(t.db, player, now);
        expect(today.status).toBe("won");
        expect(await coinsOf(player)).toBe(1000 + MINIGAME_REWARDS.easy);
        await expectConflict(
            playMinigame(t.db, player, {type: "answer", answer: rounds[0].name}, now),
            "minigame_finished",
        );
        expect(await coinsOf(player)).toBe(1000 + MINIGAME_REWARDS.easy);

        const ledger = await t.db.select().from(coinLedger).where(eq(coinLedger.userId, player));
        expect(ledger).toHaveLength(1);
        expect(ledger[0]).toMatchObject({reason: "minigame", amount: MINIGAME_REWARDS.easy});
    });

    it("never sends the current card in any response", async () => {
        const now = await dayWith("who_is_it", "hard");
        const player = await newPlayer();
        const started = JSON.stringify(await startMinigame(t.db, player, now));
        const {rounds} = await stateOf<WhoIsItState>(player, now);
        const first = rounds[0];

        for (const secret of [first.cardId, first.name, first.images.small, first.images.large]) {
            expect(started).not.toContain(secret);
        }
        expect(JSON.stringify(await getMinigame(t.db, player, now))).not.toContain(first.name);

        const afterAnswer = JSON.stringify(await playMinigame(t.db, player, {type: "answer", answer: "nie wiem"}, now));
        expect(afterAnswer).toContain(first.name);
        expect(afterAnswer).not.toContain(rounds[1].name);
        expect(afterAnswer).not.toContain(rounds[1].images.small);
    });

    it("serves the clue of the current round only, while the game runs", async () => {
        const now = await dayWith("who_is_it", "medium");
        const player = await newPlayer();
        expect(await getCurrentClue(t.db, player, now)).toBeNull();
        await startMinigame(t.db, player, now);
        const {rounds} = await stateOf<WhoIsItState>(player, now);
        expect((await getCurrentClue(t.db, player, now))?.round.cardId).toBe(rounds[0].cardId);
        expect((await getCurrentClue(t.db, player, now))?.difficulty).toBe("medium");

        await playMinigame(t.db, player, {type: "answer", answer: rounds[0].name}, now);
        expect((await getCurrentClue(t.db, player, now))?.round.cardId).toBe(rounds[1].cardId);

        for (const round of rounds.slice(1)) {
            await playMinigame(t.db, player, {type: "answer", answer: round.name}, now);
        }
        expect(await getCurrentClue(t.db, player, now)).toBeNull();
    });

    it("has no clue in other games", async () => {
        const now = await dayWith("memory", "easy");
        const player = await newPlayer();
        await startMinigame(t.db, player, now);
        expect(await getCurrentClue(t.db, player, now)).toBeNull();
    });

    it("uses only Pokémon from the real catalog", async () => {
        const now = await dayWith("who_is_it", "easy");
        const player = await newPlayer();
        await startMinigame(t.db, player, now);
        const {rounds} = await stateOf<WhoIsItState>(player, now);
        const ids = rounds.map((round) => round.cardId);
        const rows = await t.db.select().from(cards);
        for (const id of ids) {
            const card = rows.find((row) => row.id === id)!;
            expect(card.subtypes?.some((subtype) => ["Basic", "Stage 1", "Stage 2"].includes(subtype))).toBe(true);
            expect(card.name.endsWith("Energy")).toBe(false);
        }
    });
});

describe("Memory on the server", () => {
    it("pays the reward when all pairs are found", async () => {
        const now = await dayWith("memory", "medium");
        const player = await newPlayer(1000);
        await startMinigame(t.db, player, now);
        const {deck} = await stateOf<MemoryState>(player, now);
        for (let card = 0; card < 8; card++) {
            const [a, b] = deck.flatMap((value, position) => (value === card ? [position] : []));
            await playMinigame(t.db, player, {type: "flip", position: a}, now);
            await playMinigame(t.db, player, {type: "flip", position: b}, now);
        }
        expect((await getMinigame(t.db, player, now)).status).toBe("won");
        expect(await coinsOf(player)).toBe(1000 + MINIGAME_REWARDS.medium);
    });

    it("pays nothing when the hard level is lost", async () => {
        const now = await dayWith("memory", "hard");
        const player = await newPlayer(1000);
        await startMinigame(t.db, player, now);
        const {deck} = await stateOf<MemoryState>(player, now);
        const a = 0;
        const b = deck.findIndex((value, position) => position !== a && value !== deck[a]);
        let status = "in_progress";
        for (let i = 0; i < 15 && status === "in_progress"; i++) {
            await playMinigame(t.db, player, {type: "flip", position: a}, now);
            status = (await playMinigame(t.db, player, {type: "flip", position: b}, now)).status;
        }
        expect(status).toBe("lost");
        expect(await coinsOf(player)).toBe(1000);
    });

    it("hides cards from the response until they are turned", async () => {
        const now = await dayWith("memory", "easy");
        const player = await newPlayer();
        const started = JSON.stringify(await startMinigame(t.db, player, now));
        const {cards: dealt} = await stateOf<MemoryState>(player, now);
        for (const card of dealt) expect(started).not.toContain(card.image);
    });
});

describe("the sliding puzzle on the server", () => {
    it("pays the reward after replaying moves to the solution", async () => {
        const now = await dayWith("sliding_puzzle", "easy");
        const player = await newPlayer(1000);
        await startMinigame(t.db, player, now);

        // A board one move from the solution, so the test does not need a solver.
        const near = [...solvedTiles(3)];
        [near[7], near[8]] = [near[8], near[7]];
        const [attempt] = await t.db
            .select()
            .from(minigameAttempts)
            .where(and(eq(minigameAttempts.userId, player), eq(minigameAttempts.gameDay, gameDayOf(now))));
        await t.db
            .update(minigameAttempts)
            .set({state: {...(attempt.state as object), tiles: near}})
            .where(and(eq(minigameAttempts.userId, player), eq(minigameAttempts.gameDay, gameDayOf(now))));

        const result = await playMinigame(t.db, player, {type: "moves", cells: [8]}, now);
        expect(result.status).toBe("won");
        expect(await coinsOf(player)).toBe(1000 + MINIGAME_REWARDS.easy);
    });

    it("cannot be solved by claiming a finished board", async () => {
        const now = await dayWith("sliding_puzzle", "medium");
        const player = await newPlayer(1000);
        await startMinigame(t.db, player, now);
        await expectConflict(playMinigame(t.db, player, {type: "moves", cells: [0, 0, 0, 0]}, now), "illegal_move");
        expect((await getMinigame(t.db, player, now)).status).toBe("in_progress");
        expect(await coinsOf(player)).toBe(1000);
    });
});
