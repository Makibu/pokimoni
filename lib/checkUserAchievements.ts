import {Achievement, UserStats} from "@/lib/type";

export type UserAchievement = {
    achievement_id: number;
};

const rarityOrder: Record<string, number> = {
    "common": 1,
    "uncommon": 2,
    "rare": 3,
    "double rare": 4,
    "ultra rare": 5,
    "ace spec rare": 6,
    "illustration rare": 7,
    "special illustration rare": 8,
    "hyper rare": 9,
    "secret rare": 10,
};

const achievementCheckers: Record<
    string,
    (stats: UserStats, ach: Achievement) => boolean
> = {
    cards_overall: (stats, ach) => stats.total_cards >= (ach.amount ?? Infinity),

    packs_overall: (stats, ach) => stats.total_packs >= (ach.amount ?? Infinity),

    cards_duplicates: (stats, ach) =>
        (stats.total_duplicates ?? 0) >= (ach.amount ?? Infinity),
};

function checkCardsRarity(stats: UserStats, ach: Achievement): boolean {
    const parts = ach.type.split("_");
    const isPlus = parts[parts.length - 1] === "plus";

    const rarityKey = isPlus
        ? parts.slice(2, -1).join(" ")
        : parts.slice(2).join(" ");

    const rarityRank = rarityOrder[rarityKey];
    if (!rarityRank) return false;

    let count = 0;
    if (isPlus) {
        count =
            stats.rarityStats
                ?.filter((r) => rarityOrder[r.rarity] >= rarityRank)
                .reduce((sum, r) => sum + r.count, 0) ?? 0;
    } else {
        count =
            stats.rarityStats?.find((r) => r.rarity === rarityKey)?.count ?? 0;
    }

    return count >= (ach.amount ?? Infinity);
}

export async function checkUserAchievements(
    uid: string,
    stats: UserStats
) {
    const resAll = await fetch("/api/achievements");
    if (!resAll.ok) return null;
    const jsonAll = await resAll.json();
    const allAchievements: Achievement[] = jsonAll.achievements || [];

    const resUser = await fetch(`/api/user/achievements?uid=${uid}`);
    if (!resUser.ok) return null;
    const json = await resUser.json();
    const userAchievements: UserAchievement[] = json.userAchievements || [];
    const earnedIds = userAchievements.map((a) => a.achievement_id);

    const newlyEarned = allAchievements.filter((ach) => {
        if (earnedIds.includes(ach.id)) return false;

        if (ach.type.startsWith("cards_rarity_")) {
            return checkCardsRarity(stats, ach);
        }

        const checker = achievementCheckers[ach.type];
        return checker ? checker(stats, ach) : false;
    });

    if (newlyEarned.length > 0) {
        await fetch("/api/user/achievements", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({uid, achievements: newlyEarned.map((a) => a.id)}),
        });
    }

    return newlyEarned;
}
