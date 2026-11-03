import achievementsJson from "../../../data/catalog/achievements.json";
import badgesJson from "../../../data/catalog/badges.json";
import cardsJson from "../../../data/catalog/cards.json";
import setsJson from "../../../data/catalog/sets.json";
import {PACK_PRICES} from "@/domain/economy";
import {parseRarity} from "@/domain/rarity";
import type {achievements, badges, cards, sets} from "./schema";

type NewSet = typeof sets.$inferInsert;
type NewCard = typeof cards.$inferInsert;
type NewAchievement = typeof achievements.$inferInsert;
type NewBadge = typeof badges.$inferInsert;

/** Achievements worth at least this many coins reward packs instead of coins. */
export const PACK_REWARD_THRESHOLD = 500;

export const catalogSets: NewSet[] = setsJson.map((set) => ({
    id: set.id,
    name: set.name,
    series: set.series,
    tier: set.class,
    total: set.total,
    printedTotal: set.printed_total,
    releaseDate: set.release_date,
    images: set.images,
}));

export const catalogCards: NewCard[] = cardsJson.map((card) => ({
    id: card.id,
    setId: card.set_id,
    name: card.name,
    rarity: parseRarity(card.rarity),
    income: card.income,
    images: card.images,
    subtypes: card.subtypes,
}));

/**
 * Legacy rewards were coin amounts written as text ("500 monet"). Small rewards stay coins; large
 * ones become top-tier pack vouchers of roughly the same value.
 */
export const catalogAchievements: NewAchievement[] = achievementsJson.map((achievement) => {
    const coins = Number.parseInt(achievement.reward[0], 10);
    if (!Number.isFinite(coins)) throw new Error(`Achievement ${achievement.id} has no coin reward`);
    const reward =
        coins < PACK_REWARD_THRESHOLD
            ? {rewardCoins: coins}
            : {rewardPackTier: 3, rewardPackQuantity: Math.round(coins / PACK_PRICES[3])};
    return {
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        rarity: achievement.rarity as NewAchievement["rarity"],
        type: achievement.type,
        amount: achievement.amount,
        ...reward,
    };
});

/** Badge rules previously hard-coded in the client (lib/badgesData.ts); the database is now the only source. */
const badgeRules: Record<number, Pick<NewBadge, "name" | "description" | "unit" | "amount" | "icon">> = {
    1: {name: "Kolekcjoner", description: "Zdobycie 1000 kart w kolekcji", unit: "cards", amount: 1000, icon: "award"},
    2: {
        name: "Mistrz Rzadkości",
        description: "Zdobycie przynajmniej jednej karty typu Secret Rare",
        unit: "secret_rare_cards",
        amount: 1,
        icon: "star",
    },
    3: {
        name: "Bogacz",
        description: "Posiadanie przychodu równego 30 monet lub więcej",
        unit: "income_per_hour",
        amount: 30,
        icon: "coins",
    },
    4: {
        name: "Łowca Secret Rare",
        description: "Zdobądź 3 karty typu Secret Rare",
        unit: "secret_rare_cards",
        amount: 3,
        icon: "gem",
    },
    5: {name: "Ćwierć Kolekcji", description: "Zdobądź 250 kart", unit: "cards", amount: 250, icon: "award"},
    6: {
        name: "Mistrz Kolekcji",
        description: "Zdobądź wszystkie karty",
        unit: "all_cards",
        amount: null,
        icon: "trophy",
    },
    7: {name: "Otwarcie Tysiąca", description: "Otwórz 1000 paczek", unit: "packs", amount: 1000, icon: "boxes"},
    8: {name: "Otwarcie Setki", description: "Otwórz 100 paczek", unit: "packs", amount: 100, icon: "package"},
    9: {
        name: "Elita Rzadkości",
        description: "Zdobądź 150 kart typu Special Illustration Rare lub wyższego",
        unit: "special_illustration_plus_cards",
        amount: 150,
        icon: "crown",
    },
};

export const catalogBadges: NewBadge[] = badgesJson.map((badge) => {
    const rule = badgeRules[badge.id];
    if (!rule) throw new Error(`Missing rule for badge ${badge.id}`);
    return {id: badge.id, category: badge.type, ...rule};
});
