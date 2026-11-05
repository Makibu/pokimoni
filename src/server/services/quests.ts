import {and, asc, eq, isNull, sql} from "drizzle-orm";
import {QUEST_REWARD, QUESTS_PER_DAY} from "@/domain/economy";
import {gameDayOf, type GameDay} from "@/domain/game-day";
import type {Rng} from "@/domain/packs";
import {drawQuests, questAdvance, type QuestEvent, questTitle, type QuestType} from "@/domain/quests";
import {dailyQuests, playerState} from "@/server/db/schema";
import type {Db, Tx} from "@/server/db/types";
import {AppError} from "@/server/http/errors";
import {secureRng} from "@/server/rng";
import {changeCoins} from "./coins";

export type QuestView = {
    slot: number;
    title: string;
    target: number;
    progress: number;
    reward: number;
    claimed: boolean;
};

function loadQuests(db: Db | Tx, userId: string, day: GameDay) {
    return db
        .select()
        .from(dailyQuests)
        .where(and(eq(dailyQuests.userId, userId), eq(dailyQuests.gameDay, day)))
        .orderBy(asc(dailyQuests.slot));
}

/** Draws the day's quests once. The caller holds the player's lock, so two requests cannot both draw. */
async function ensureDailyQuests(tx: Tx, userId: string, day: GameDay, rng: Rng) {
    const existing = await loadQuests(tx, userId, day);
    if (existing.length > 0) return existing;
    return tx
        .insert(dailyQuests)
        .values(
            drawQuests(QUESTS_PER_DAY, rng).map((quest, index) => ({
                userId,
                gameDay: day,
                slot: index + 1,
                questType: quest.type,
                target: quest.target,
            })),
        )
        .returning();
}

/** Moves the day's quests forward. Draws them first, so progress counts even before the player has seen them. */
export async function recordQuestEvent(
    tx: Tx,
    userId: string,
    day: GameDay,
    event: QuestEvent,
    rng: Rng = secureRng,
): Promise<void> {
    for (const quest of await ensureDailyQuests(tx, userId, day, rng)) {
        const advance = questAdvance(quest.questType as QuestType, event);
        if (advance === 0 || quest.progress >= quest.target) continue;
        await tx
            .update(dailyQuests)
            .set({progress: Math.min(quest.target, quest.progress + advance)})
            .where(and(eq(dailyQuests.userId, userId), eq(dailyQuests.gameDay, day), eq(dailyQuests.slot, quest.slot)));
    }
}

export async function getQuests(db: Db, userId: string, now = new Date(), rng: Rng = secureRng): Promise<QuestView[]> {
    const day = gameDayOf(now);
    let quests = await loadQuests(db, userId, day);
    if (quests.length === 0) {
        quests = await db.transaction(async (tx) => {
            await tx.select().from(playerState).where(eq(playerState.userId, userId)).for("update");
            return ensureDailyQuests(tx, userId, day, rng);
        });
    }
    return quests.map((quest) => ({
        slot: quest.slot,
        title: questTitle(quest.questType as QuestType, quest.target),
        target: quest.target,
        progress: quest.progress,
        reward: QUEST_REWARD,
        claimed: quest.claimedAt !== null,
    }));
}

/** Pays a finished quest of the current game day exactly once. */
export async function claimQuest(db: Db, userId: string, slot: number, now = new Date()) {
    const day = gameDayOf(now);
    return db.transaction(async (tx) => {
        // Same lock order as everything else that touches quests and coins, so they cannot deadlock.
        await tx.select().from(playerState).where(eq(playerState.userId, userId)).for("update");
        const [claimed] = await tx
            .update(dailyQuests)
            .set({claimedAt: now})
            .where(
                and(
                    eq(dailyQuests.userId, userId),
                    eq(dailyQuests.gameDay, day),
                    eq(dailyQuests.slot, slot),
                    isNull(dailyQuests.claimedAt),
                    sql`${dailyQuests.progress} >= ${dailyQuests.target}`,
                ),
            )
            .returning();
        if (!claimed) throw new AppError(409, "cannot_claim", "Tej nagrody nie można odebrać");
        const coins = await changeCoins(tx, userId, QUEST_REWARD, "quest", `${day}:${slot}`);
        return {coins, reward: QUEST_REWARD};
    });
}
