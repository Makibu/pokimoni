import {and, eq} from "drizzle-orm";
import {type MinigameDifficulty, MINIGAME_REWARDS} from "@/domain/economy";
import {addDays, gameDayOf, type GameDay} from "@/domain/game-day";
import {
    applyAction,
    type CatalogCard,
    createMinigame,
    IllegalMinigameAction,
    type Minigame,
    type MinigameAction,
    type MinigameState,
    type MinigameVariant,
    type MinigameView,
    type Outcome,
    pickVariant,
    viewOf,
} from "@/domain/minigames";
import {currentClue, type WhoIsItRound} from "@/domain/minigames/who-is-it";
import type {Rng} from "@/domain/packs";
import {cards, minigameAttempts, minigameDays, playerState} from "@/server/db/schema";
import type {Db} from "@/server/db/types";
import {AppError} from "@/server/http/errors";
import {secureRng} from "@/server/rng";
import {changeCoins} from "./coins";
import {recordQuestEvent} from "./quests";

/** The variant of a game day, chosen once. Concurrent first requests all get the same result. */
export async function ensureMinigameDay(db: Db, day: GameDay, rng: Rng = secureRng): Promise<MinigameVariant> {
    const [existing] = await db.select().from(minigameDays).where(eq(minigameDays.gameDay, day));
    if (existing) return {game: existing.game, difficulty: existing.difficulty};

    const [previous] = await db
        .select()
        .from(minigameDays)
        .where(eq(minigameDays.gameDay, addDays(day, -1)));
    const variant = pickVariant(previous ? {game: previous.game, difficulty: previous.difficulty} : null, rng);
    // Every player gets their own cards, so friends cannot pass the answers to each other.
    await db
        .insert(minigameDays)
        .values({gameDay: day, ...variant, payload: {}})
        .onConflictDoNothing();

    const [stored] = await db.select().from(minigameDays).where(eq(minigameDays.gameDay, day));
    return {game: stored.game, difficulty: stored.difficulty};
}

export type MinigameToday = {
    game: Minigame;
    difficulty: MinigameDifficulty;
    reward: number;
    status: "not_started" | Outcome;
    view: MinigameView | null;
};

type Attempt = typeof minigameAttempts.$inferSelect;

function todayFrom(attempt: Attempt): MinigameToday {
    const state = attempt.state as MinigameState;
    return {
        game: state.game,
        difficulty: state.difficulty,
        reward: MINIGAME_REWARDS[state.difficulty],
        status: attempt.status,
        view: viewOf(state),
    };
}

async function loadAttempt(db: Pick<Db, "select">, userId: string, day: GameDay) {
    const [attempt] = await db
        .select()
        .from(minigameAttempts)
        .where(and(eq(minigameAttempts.userId, userId), eq(minigameAttempts.gameDay, day)));
    return attempt;
}

export async function getMinigame(db: Db, userId: string, now = new Date(), rng: Rng = secureRng) {
    const day = gameDayOf(now);
    const variant = await ensureMinigameDay(db, day, rng);
    const attempt = await loadAttempt(db, userId, day);
    if (attempt) return todayFrom(attempt);
    const today: MinigameToday = {
        ...variant,
        reward: MINIGAME_REWARDS[variant.difficulty],
        status: "not_started",
        view: null,
    };
    return today;
}

/** Starts the day's only attempt. Starting again returns the running game, so no one gets a new deal. */
export async function startMinigame(db: Db, userId: string, now = new Date(), rng: Rng = secureRng) {
    const day = gameDayOf(now);
    const variant = await ensureMinigameDay(db, day, rng);

    const catalog: CatalogCard[] = await db
        .select({
            id: cards.id,
            name: cards.name,
            rarity: cards.rarity,
            images: cards.images,
            subtypes: cards.subtypes,
        })
        .from(cards);

    return db.transaction(async (tx) => {
        await tx.select().from(playerState).where(eq(playerState.userId, userId)).for("update");
        const existing = await loadAttempt(tx, userId, day);
        if (existing) return todayFrom(existing);

        const [attempt] = await tx
            .insert(minigameAttempts)
            .values({userId, gameDay: day, state: createMinigame(variant, catalog, rng)})
            .returning();
        return todayFrom(attempt);
    });
}

/** Applies a move on the server's copy of the game. Finishing pays the reward once and counts for quests. */
export async function playMinigame(db: Db, userId: string, action: MinigameAction, now = new Date()) {
    const day = gameDayOf(now);
    return db.transaction(async (tx) => {
        await tx.select().from(playerState).where(eq(playerState.userId, userId)).for("update");
        const attempt = await loadAttempt(tx, userId, day);
        if (!attempt) throw new AppError(409, "minigame_not_started", "Dzisiejsza gra nie została rozpoczęta");
        if (attempt.status !== "in_progress") {
            throw new AppError(409, "minigame_finished", "Dzisiejsza gra jest już zakończona");
        }

        let result: ReturnType<typeof applyAction>;
        try {
            result = applyAction(attempt.state as MinigameState, action);
        } catch (error) {
            if (error instanceof IllegalMinigameAction) {
                throw new AppError(409, "illegal_move", "Ten ruch jest niedozwolony");
            }
            throw error;
        }

        const finished = result.outcome !== "in_progress";
        const reward = result.outcome === "won" ? MINIGAME_REWARDS[result.state.difficulty] : finished ? 0 : null;
        const [updated] = await tx
            .update(minigameAttempts)
            .set({state: result.state, status: result.outcome, reward, finishedAt: finished ? now : null})
            .where(and(eq(minigameAttempts.userId, userId), eq(minigameAttempts.gameDay, day)))
            .returning();

        if (reward) await changeCoins(tx, userId, reward, "minigame", day);
        if (finished) await recordQuestEvent(tx, userId, day, {kind: "minigame_finished"});
        return todayFrom(updated);
    });
}

/** The picture to guess in "Kto to Pokémon?". Null when no round is waiting for an answer. */
export async function getCurrentClue(
    db: Db,
    userId: string,
    now = new Date(),
): Promise<{round: WhoIsItRound; difficulty: MinigameDifficulty} | null> {
    const attempt = await loadAttempt(db, userId, gameDayOf(now));
    if (attempt?.status !== "in_progress") return null;
    const state = attempt.state as MinigameState;
    const round = state.game === "who_is_it" ? currentClue(state) : null;
    return round && {round, difficulty: state.difficulty};
}
