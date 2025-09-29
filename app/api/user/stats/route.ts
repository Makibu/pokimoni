import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabaseServer";

interface CardWithRarity {
    id: string;
    name: string;
    rarity: string | null;
    income?: number | null;
}

interface UserCardWithRarity {
    quantity: number;
    cards: CardWithRarity[];
    acquired_at?: string | null;
}

export async function GET(req: Request) {
    try {
        const {searchParams} = new URL(req.url);
        const uid = searchParams.get("uid");

        if (!uid) {
            return NextResponse.json({error: "Brak uid w zapytaniu"}, {status: 400});
        }

        const {data: statsData, error: statsError} = await supabaseServer
            .from("user_stats")
            .select("*")
            .eq("uid", uid)
            .single();
        if (statsError) return NextResponse.json({error: statsError.message}, {status: 500});

        const {data: cardStats, error: cardError} = await supabaseServer
            .from("user_cards")
            .select(`
        quantity,
        cards:cards(id, name, rarity, income, images),
        acquired_at
      `)
            .eq("uid", uid) as { data: UserCardWithRarity[] | null; error: any };
        if (cardError) return NextResponse.json({error: cardError.message}, {status: 500});

        const {count: cardsTotal, error: cardsTotalError} = await supabaseServer
            .from("cards")
            .select("*", {count: "exact", head: true});

        if (cardsTotalError) return NextResponse.json({error: cardsTotalError.message}, {status: 500});

        const allRarity = [
            "common",
            "uncommon",
            "rare",
            "double rare",
            "ultra rare",
            "ace spec rare",
            "illustration rare",
            "special illustration rare",
            "hyper rare",
            "secret rare",
        ];

        const rarityStats: Record<string, number> = {};
        allRarity.forEach(r => (rarityStats[r] = 0));

        cardStats?.forEach(c => {
            const card = Array.isArray(c.cards) ? c.cards[0] : (c.cards as any);
            if (!card) return;

            const rarityKey = (card.rarity ?? "Unknown").toString().toLowerCase();

            const matchedRarity = allRarity.find(r => r.toLowerCase() === rarityKey) ?? "Unknown";

            rarityStats[matchedRarity] = (rarityStats[matchedRarity] || 0) + (c.quantity ?? 0);
        });


        const totalCardsCount = Object.values(rarityStats).reduce((s, v) => s + v, 0);
        const rarityStatsWithPercent = allRarity.map(rarity => ({
            rarity,
            count: rarityStats[rarity] ?? 0,
            percent: totalCardsCount > 0 ? Math.round(((rarityStats[rarity] ?? 0) / totalCardsCount) * 100) : 0
        }));

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

        let bestCard: CardWithRarity | null = null;
        cardStats?.forEach(c => {
            const card = Array.isArray(c.cards) ? c.cards[0] : (c.cards as any);
            if (!card) return;
            const income = Number(card.income ?? 0);
            const bestIncome = Number(bestCard?.income ?? 0);
            if (!bestCard || income > bestIncome) bestCard = card;
        });

        const {data: userBadges} = await supabaseServer
            .from("user_badges")
            .select("badge_id")
            .eq("user_id", uid);

        const {data: userPacks, error: packError} = await supabaseServer
            .from("user_packs")
            .select("set_id")
            .eq("uid", uid);
        if (packError) return NextResponse.json({error: packError.message}, {status: 500});

        const packCounts: Record<string, number> = {};
        userPacks?.forEach(p => {
            if (!p.set_id) return;
            packCounts[p.set_id] = (packCounts[p.set_id] || 0) + 1;
        });
        const favoriteSetEntry = Object.entries(packCounts).reduce<{ setId: string; count: number }>(
            (best, [setId, count]) => (count > best.count ? {setId, count} : best),
            {setId: "", count: 0}
        );
        let favoritePack = null;
        if (favoriteSetEntry.setId) {
            const {data: setData} = await supabaseServer
                .from("sets")
                .select("name, images")
                .eq("id", favoriteSetEntry.setId)
                .single();
            favoritePack = {
                name: setData?.name ?? "Unknown",
                opened: favoriteSetEntry.count,
                images: setData?.images ?? "Unknown"
            };
        }

        const [recentCards, recentAchievements, recentBadges] = await Promise.all([
            supabaseServer.from("user_cards")
                .select("cards(id, name, rarity), acquired_at")
                .eq("uid", uid)
                .order("acquired_at", {ascending: false})
                .limit(20),
            supabaseServer.from("user_achievements")
                .select("achievements(id, title), unlocked_at")
                .eq("uid", uid)
                .order("unlocked_at", {ascending: false})
                .limit(5),
            supabaseServer.from("user_badges")
                .select("badges(id, name), acquired_at")
                .eq("user_id", uid)
                .order("acquired_at", {ascending: false})
                .limit(5)
        ]);

        const minRarityValue = rarityOrder["special illustration rare"] ?? 8;

        const recentCardActivities = (recentCards.data ?? []).map((c: any) => {
            const card: CardWithRarity | null = Array.isArray(c.cards) ? c.cards[0] ?? null : (c.cards ?? null);
            if (!card) return null;
            const rarityKey = (card.rarity ?? "Unknown").toString().toLowerCase();
            const cardRarityValue = rarityOrder[Object.keys(rarityOrder).find(k => k.toLowerCase() === rarityKey) ?? "Unknown"] ?? 0;
            if (cardRarityValue < minRarityValue) return null;
            return {action: "Zdobył kartę", item: `${card.name} (${card.rarity})`, time: c.acquired_at};
        }).filter(Boolean);

        const recentAchievementActivities = (recentAchievements.data ?? []).map((a: any) => {
            const ach = Array.isArray(a.achievements) ? a.achievements[0] ?? null : (a.achievements ?? null);
            if (!ach) return null;
            return {action: "Ukończył osiągnięcie", item: ach.title, time: a.unlocked_at};
        }).filter(Boolean);

        const recentBadgeActivities = (recentBadges.data ?? []).map((b: any) => {
            const badge = Array.isArray(b.badges) ? b.badges[0] ?? null : (b.badges ?? null);
            if (!badge) return null;
            return {action: "Zdobył odznakę", item: badge.name, time: b.acquired_at};
        }).filter(Boolean);

        const recentActivity = [...recentCardActivities, ...recentAchievementActivities, ...recentBadgeActivities]
            .sort((a, b) => new Date(b?.time).getTime() - new Date(a?.time).getTime())
            .slice(0, 5);

        return NextResponse.json({
            userStats: {
                ...statsData,
                rarityStats: rarityStatsWithPercent.reverse(),
                totalAchievementsCount: (await supabaseServer.from("achievements").select("*", {
                    count: "exact",
                    head: true
                })).count ?? 0,
                userBadges,
                favoritePack,
                recentActivity,
                bestCard,
                cardsTotal,
            }
        });
    } catch (err: any) {
        return NextResponse.json({error: err.message}, {status: 500});
    }
}
