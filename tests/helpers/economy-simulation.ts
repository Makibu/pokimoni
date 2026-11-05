import achievementsJson from "../../data/catalog/achievements.json";
import cardsJson from "../../data/catalog/cards.json";
import setsJson from "../../data/catalog/sets.json";
import {pickDailyPack} from "@/domain/daily-pack";
import {
    evaluateDailyClaim,
    MINIGAME_REWARDS,
    type PackTier,
    packPrice,
    piggyBankBalance,
    QUEST_REWARD,
    QUESTS_PER_DAY,
    STARTING_COINS,
} from "@/domain/economy";
import {addDays, type GameDay} from "@/domain/game-day";
import {type MinigameVariant, pickVariant} from "@/domain/minigames";
import {drawPack, type PackCard, resolveDrawnCards, type Rng} from "@/domain/packs";
import {isAchievementMet, type PlayerProgress} from "@/domain/progress";
import {drawQuests, type QuestEvent, questAdvance} from "@/domain/quests";
import {parseRarity, type Rarity} from "@/domain/rarity";

/** How a player behaves. Everything else comes from the real rules in `domain/`. */
export type Profile = {
    name: string;
    /** The pack tier the player saves for and buys. */
    tier: PackTier;
    /** How many times a day the player empties the piggy bank. */
    collectionsPerDay: number;
    /** Chance of winning the daily minigame. */
    winChance: number;
};

export type DayResult = {
    /** Daily reward, quests and minigame. */
    steady: number;
    piggy: number;
    achievements: number;
    packs: number;
    incomePerHour: number;
    uniqueCards: number;
};

export type PlayerResult = {days: DayResult[]; firstSetFinishedOnDay: number | null};

type SimCard = PackCard & {income: number; setId: string};

const SLOTS = 2;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const FIRST_HOUR = 8;
const LAST_HOUR = 20;
const START_DAY = "2026-01-01" as GameDay;
const START_MS = Date.UTC(2026, 0, 1);

const CARDS: SimCard[] = cardsJson.map((card) => ({
    id: card.id,
    rarity: parseRarity(card.rarity),
    income: card.income,
    setId: card.set_id,
}));

const SETS = setsJson.map((set) => ({
    id: set.id,
    tier: set.class as PackTier,
    cards: CARDS.filter((card) => card.setId === set.id),
}));

const CANDIDATES = SETS.map(({id, tier}) => ({id, tier}));

const ACHIEVEMENTS = achievementsJson.map((achievement) => ({
    type: achievement.type,
    amount: achievement.amount,
    coins: achievement.reward.reduce((sum, reward) => sum + Number.parseInt(reward, 10), 0),
}));

function collectionHours(count: number): number[] {
    if (count === 1) return [FIRST_HOUR];
    return Array.from({length: count}, (_, i) => FIRST_HOUR + ((LAST_HOUR - FIRST_HOUR) * i) / (count - 1));
}

/** Plays one player through the real rules: pack draws, quests, streak, piggy bank and achievements. */
export function simulatePlayer(profile: Profile, dayCount: number, rng: Rng): PlayerResult {
    let coins = STARTING_COINS;
    let packsOpened = 0;
    let totalCards = 0;
    let lastCollectedAt = new Date(START_MS);
    let streak = {streakDay: 0, lastClaimDay: null as GameDay | null};
    let previousVariant: MinigameVariant | null = null;
    let firstSetFinishedOnDay: number | null = null;

    const owned = new Map<string, number>();
    const slots: number[] = [];
    const copiesByRarity: Partial<Record<Rarity, number>> = {};
    const timesChosen = new Map<string, number>();
    const claimed = new Set<number>();
    const missing = new Map(SETS.map((set) => [set.id, set.cards.length]));
    const preferred = SETS.filter((set) => set.tier === profile.tier);

    const incomePerHour = () => slots.reduce((sum, income) => sum + income, 0);

    const days: DayResult[] = [];
    for (let dayIndex = 0; dayIndex < dayCount; dayIndex++) {
        const today = addDays(START_DAY, dayIndex);
        const day: DayResult = {steady: 0, piggy: 0, achievements: 0, packs: 0, incomePerHour: 0, uniqueCards: 0};

        const dailySetId = pickDailyPack(CANDIDATES, timesChosen, rng);
        timesChosen.set(dailySetId, (timesChosen.get(dailySetId) ?? 0) + 1);
        const dailySet = SETS.find((set) => set.id === dailySetId)!;

        const quests = drawQuests(QUESTS_PER_DAY, rng).map((quest) => ({...quest, progress: 0, claimed: false}));
        const advanceQuests = (event: QuestEvent) => {
            for (const quest of quests) {
                quest.progress = Math.min(quest.target, quest.progress + questAdvance(quest.type, event));
                if (quest.progress >= quest.target && !quest.claimed) {
                    quest.claimed = true;
                    coins += QUEST_REWARD;
                    day.steady += QUEST_REWARD;
                }
            }
        };

        const open = (set: (typeof SETS)[number], source: "shop" | "daily_pack") => {
            const {cards} = drawPack(set.cards, set.tier, rng);
            const resolved = resolveDrawnCards(
                cards.map((card) => card.id),
                owned,
            );
            const events: {rarity: Rarity; isNew: boolean}[] = [];
            cards.forEach((card, position) => {
                const {isNew, overLimit} = resolved[position];
                events.push({rarity: card.rarity, isNew});
                if (overLimit) return;
                owned.set(card.id, (owned.get(card.id) ?? 0) + 1);
                totalCards++;
                copiesByRarity[card.rarity] = (copiesByRarity[card.rarity] ?? 0) + 1;
                if (isNew) missing.set(set.id, missing.get(set.id)! - 1);
                slots.push(card.income);
                slots.sort((a, b) => b - a);
                slots.length = Math.min(slots.length, SLOTS);
            });
            packsOpened++;
            day.packs++;
            if (firstSetFinishedOnDay === null && missing.get(set.id) === 0) firstSetFinishedOnDay = dayIndex + 1;
            advanceQuests({kind: "pack_opened", source, cards: events});

            const progress: PlayerProgress = {
                uniqueCards: owned.size,
                totalCards,
                catalogCards: CARDS.length,
                packsOpened,
                incomePerHour: incomePerHour(),
                copiesByRarity,
            };
            ACHIEVEMENTS.forEach((achievement, index) => {
                if (claimed.has(index) || !isAchievementMet(achievement, progress)) return;
                claimed.add(index);
                coins += achievement.coins;
                day.achievements += achievement.coins;
            });
        };

        /** Buys the quest's daily pack first, then the preferred tier, focusing on the nearest finished set. */
        const spend = () => {
            for (;;) {
                const dailyPrice = packPrice(dailySet.tier, {dailyPack: true});
                const wantsDaily = quests.some((quest) => quest.type === "open_daily_pack" && !quest.claimed);
                if ((wantsDaily || dailySet.tier === profile.tier) && coins >= dailyPrice) {
                    coins -= dailyPrice;
                    open(dailySet, "daily_pack");
                    continue;
                }
                const price = packPrice(profile.tier, {dailyPack: false});
                if (coins < price) return;
                coins -= price;
                const target = preferred
                    .filter((set) => missing.get(set.id)! > 0)
                    .sort((a, b) => missing.get(a.id)! - missing.get(b.id)!)[0];
                open(target ?? preferred[0], "shop");
            }
        };

        const claim = evaluateDailyClaim(streak, today);
        if (claim.claimable) {
            streak = {streakDay: claim.streakDay, lastClaimDay: today};
            coins += claim.reward;
            day.steady += claim.reward;
        }

        const variant: MinigameVariant = pickVariant(previousVariant, rng);
        previousVariant = variant;
        if (rng() < profile.winChance) {
            coins += MINIGAME_REWARDS[variant.difficulty];
            day.steady += MINIGAME_REWARDS[variant.difficulty];
        }
        advanceQuests({kind: "minigame_finished"});

        for (const hour of collectionHours(profile.collectionsPerDay)) {
            const now = new Date(START_MS + dayIndex * DAY_MS + hour * HOUR_MS);
            const balance = piggyBankBalance(incomePerHour(), lastCollectedAt, now);
            coins += balance;
            day.piggy += balance;
            lastCollectedAt = now;
            advanceQuests({kind: "piggy_collected"});
            spend();
        }

        day.incomePerHour = incomePerHour();
        day.uniqueCards = owned.size;
        days.push(day);
    }
    return {days, firstSetFinishedOnDay};
}

export const earnedOf = (day: DayResult) => day.steady + day.piggy + day.achievements;
