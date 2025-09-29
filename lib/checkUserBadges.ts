import {badges} from "@/lib/badgesData";
import {UserBadge, UserStats} from "@/lib/type";

const checkers: Record<
    string,
    (stats: UserStats, badge: typeof badges[number], incomePerHour: number) => boolean
> = {
    cards: (stats, badge) => stats.total_cards >= (badge.amount ?? Infinity),
    all_cards: (stats) => stats.total_cards >= stats.cardsTotal,
    packs: (stats, badge) => stats.total_packs >= (badge.amount ?? Infinity),
    coins_income: (_, badge, incomePerHour) => incomePerHour >= (badge.amount ?? Infinity),
    special_rare_cards: (stats, badge) => {
        const rareCount =
            stats.rarityStats?.find(r => r.rarity === "secret rare")?.count ?? 0;
        return rareCount >= (badge.amount ?? Infinity);
    },
    special_illustration_plus_cards: (stats, badge) => {
        const totalSpecial =
            stats.rarityStats
                ?.filter(r =>
                    ["special illustration rare", "hyper rare", "secret rare"].includes(r.rarity)
                )
                .reduce((sum, r) => sum + r.count, 0) ?? 0;
        return totalSpecial >= (badge.amount ?? Infinity);
    },
};

export async function checkUserBadges(
    uid: string,
    stats: UserStats,
    incomePerHour: number,
    units: string | string[] = "all"
) {
    const res = await fetch(`/api/user/badges?uid=${uid}`);
    if (!res.ok) return null;

    const json = await res.json();
    const userBadges: UserBadge[] = json.userBadges || [];
    const earnedIds = userBadges.map((b) => b.badge_id);

    const unitsToCheck =
        units === "all" ? Object.keys(checkers) : Array.isArray(units) ? units : [units];

    const candidates = badges.filter((badge) =>
        unitsToCheck.includes(badge.unit)
    );

    const newlyEarned = candidates.filter((badge) => {
        if (earnedIds.includes(Number(badge.id))) return false;
        const checker = checkers[badge.unit];
        return checker ? checker(stats, badge, incomePerHour) : false;
    });

    if (newlyEarned.length > 0) {
        await fetch("/api/user/badges", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({uid, badges: newlyEarned.map((b) => b.id)}),
        });
    }

    return newlyEarned;
}
