"use client";

import {
    Award,
    BarChart3,
    Boxes,
    CircleQuestionMark,
    CoinsIcon,
    Crown,
    Gem,
    Package,
    Star,
    TrendingUp,
    Trophy,
} from "lucide-react";
import Image from "next/image";
import {formatDistanceToNow} from "date-fns";
import {pl} from "date-fns/locale";
import TabHeader from "@/components/layout/TabHeader";
import {Badge} from "@/components/ui/badge";
import {HybridTooltip, HybridTooltipContent, HybridTooltipTrigger} from "@/components/ui/hybrid-tooltip";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import {RARITIES, type Rarity} from "@/domain/rarity";
import {useStatistics} from "@/features/game/use-game";

const rarityColors: Record<Rarity, string> = {
    common: "#d1d5db",
    uncommon: "#6b7280",
    rare: "#3b82f6",
    "double rare": "#2563eb",
    "ultra rare": "#9333ea",
    "hyper rare": "#ef4444",
    "special illustration rare": "#ec4899",
    "illustration rare": "#f472b6",
    "secret rare": "#111827",
    "ace spec rare": "#14b8a6",
};

const activityLabels = {
    card: {action: "Zdobyto kartę", icon: Star},
    achievement: {action: "Ukończono osiągnięcie", icon: Trophy},
    badge: {action: "Zdobyto odznakę", icon: Award},
};

const badgeIcons: Record<string, React.ElementType> = {
    award: Award,
    star: Star,
    coins: CoinsIcon,
    gem: Gem,
    trophy: Trophy,
    boxes: Boxes,
    package: Package,
    crown: Crown,
};

const statTileColors = {
    blue: {tile: "from-blue-50 to-blue-100/50 border-blue-200", value: "text-blue-600", total: "text-blue-500"},
    cyan: {tile: "from-cyan-50 to-cyan-100/50 border-cyan-200", value: "text-cyan-600", total: "text-cyan-500"},
    indigo: {
        tile: "from-indigo-50 to-indigo-100/50 border-indigo-200",
        value: "text-indigo-600",
        total: "text-indigo-500",
    },
    sky: {tile: "from-sky-50 to-sky-100/50 border-sky-200", value: "text-sky-600", total: "text-sky-500"},
    yellow: {
        tile: "from-yellow-50 to-yellow-100/50 border-yellow-200",
        value: "text-yellow-600",
        total: "text-yellow-500",
    },
};

function StatTile({
    color,
    label,
    value,
    total,
}: {
    color: keyof typeof statTileColors;
    label: string;
    value: number;
    total?: number;
}) {
    const classes = statTileColors[color];
    return (
        <div className={`bg-gradient-to-br ${classes.tile} border-2 backdrop-blur-sm rounded-lg p-4 text-center`}>
            <div className={`text-2xl font-bold ${classes.value}`}>
                {value}
                {total !== undefined && <span className={`${classes.total} text-base font-normal`}>/{total}</span>}
            </div>
            <p className="text-sm text-slate-600">{label}</p>
        </div>
    );
}

export default function StatisticsPage() {
    const {data: stats, error} = useStatistics();

    if (error) return <p>Błąd: {error.message}</p>;
    if (!stats) return <LoadingIndicator />;

    const rarityStats = [...RARITIES].reverse().map((rarity) => {
        const count = stats.copiesByRarity[rarity] ?? 0;
        return {rarity, count, percent: stats.totalCards > 0 ? Math.round((count / stats.totalCards) * 100) : 0};
    });
    const earnedBadges = stats.badges.filter((badge) => badge.earned).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-slate-50 relative overflow-hidden pb-32">
            <TabHeader
                title={"Twoje statystyki"}
                description={"Przegląd Twoich postępów i osiągnięć w kolekcjonowaniu"}
            />

            <main className="container mx-auto px-4 py-8 relative z-10">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <StatTile
                        color="blue"
                        label="Unikatowe Karty"
                        value={stats.uniqueCards}
                        total={stats.catalogCards}
                    />
                    <StatTile color="cyan" label="Wszystkie Karty" value={stats.totalCards} />
                    <StatTile color="indigo" label="Paczki" value={stats.packsOpened} />
                    <StatTile
                        color="sky"
                        label="Osiągnięcia"
                        value={stats.achievementsUnlocked}
                        total={stats.achievementsTotal}
                    />
                    <StatTile color="yellow" label="Odznaki" value={earnedBadges} total={stats.badges.length} />
                </div>

                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-x-4 gap-y-8">
                    <div className="bg-white/90 backdrop-blur-sm border-2 border-blue-100 rounded-lg p-6 w-full">
                        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            Rozkład Rzadkości
                        </h3>
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {rarityStats.map(({rarity, count, percent}) => (
                                <div key={rarity} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-sm capitalize">{rarity}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">{count}</span>
                                            <Badge className="bg-blue-50 text-blue-700 text-xs">{percent}%</Badge>
                                        </div>
                                    </div>
                                    <div className="w-full rounded-full h-1.5 bg-slate-100">
                                        <div
                                            className="h-1.5 rounded-full"
                                            style={{width: `${percent}%`, backgroundColor: rarityColors[rarity]}}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="gap-4 grid md:grid-cols-2">
                        <div className="bg-white/90 backdrop-blur-sm border-2 border-blue-100 rounded-lg px-2 py-5 md:p-6 relative flex flex-col items-center justify-between">
                            <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                                <Package className="h-5 w-5 text-indigo-600" />
                                Ulubiona Paczka
                            </h3>
                            {stats.favoriteSet ? (
                                <>
                                    <Image
                                        src={stats.favoriteSet.logo}
                                        alt={stats.favoriteSet.name}
                                        width={240}
                                        height={120}
                                        unoptimized
                                        className={"py-2"}
                                    />
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-indigo-600 mb-1">
                                            {stats.favoriteSet.name}
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            Otwarta {stats.favoriteSet.opened} razy
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center">
                                    <div className="text-xl font-bold text-indigo-600 mb-1">Brak</div>
                                    <p className="text-sm text-slate-500 px-12">
                                        Otwórz swoją pierwszą paczkę, by ją wyświetlić!
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="bg-white/90 backdrop-blur-sm border-2 border-blue-100 rounded-lg p-6 relative flex flex-col items-center justify-between">
                            <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                                <Crown className="h-5 w-5 text-yellow-600" />
                                Najlepszy Pokémon
                            </h3>
                            {stats.bestCard ? (
                                <>
                                    <Image
                                        src={stats.bestCard.imageSmall}
                                        alt={stats.bestCard.name}
                                        width={245}
                                        height={342}
                                        unoptimized
                                        className={"px-16 py-2"}
                                    />
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-yellow-600 mb-1">
                                            {stats.bestCard.name}
                                        </div>
                                        <p className="text-sm text-slate-500 capitalize">
                                            {stats.bestCard.rarity} - {stats.bestCard.income}
                                            <CoinsIcon className={"inline-block w-3 ml-1"} />
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center">
                                    <div className="text-xl font-bold text-yellow-600 mb-1">Brak</div>
                                    <div className={"text-sm text-slate-500 px-12"}>
                                        Otwórz pierwszą paczkę by zdobyć swojego pokemona!
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white/90 backdrop-blur-sm border-2 border-blue-100 rounded-lg p-6 lg:col-span-2">
                        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                            <Award className="h-5 w-5 text-orange-600" />
                            Gablota Odznak
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            {stats.badges.map((badge) => {
                                const IconComponent = badgeIcons[badge.icon] ?? Award;
                                return (
                                    <div
                                        key={badge.id}
                                        className={`p-3 rounded-lg relative text-center ${badge.earned ? "bg-orange-50 border border-orange-200" : "bg-slate-50 border border-slate-200 opacity-50"}`}
                                    >
                                        <IconComponent
                                            className={`h-6 w-6 mx-auto mb-1 ${badge.earned ? "text-orange-600" : "text-slate-400"}`}
                                        />
                                        <p className="text-xs font-medium">{badge.name}</p>
                                        <HybridTooltip>
                                            <HybridTooltipTrigger asChild>
                                                <CircleQuestionMark
                                                    className={`absolute top-2 right-2 w-4 h-4 md:w-6 md:h-6 ${badge.earned ? "text-orange-600" : "text-slate-400"}`}
                                                />
                                            </HybridTooltipTrigger>
                                            <HybridTooltipContent>
                                                <p>{badge.description}</p>
                                            </HybridTooltipContent>
                                        </HybridTooltip>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white/90 backdrop-blur-sm border-2 border-blue-100 rounded-lg p-6 lg:col-span-2">
                        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            Ostatnia Aktywność
                        </h3>
                        {stats.recentActivity.length === 0 && (
                            <p className="text-sm text-slate-500">Nic się jeszcze nie wydarzyło.</p>
                        )}
                        <div className="space-y-4">
                            {stats.recentActivity.map((activity) => {
                                const {action, icon: IconComponent} = activityLabels[activity.kind];
                                return (
                                    <div
                                        key={`${activity.kind}-${activity.item}-${activity.time}`}
                                        className="flex items-center gap-4 p-3 bg-slate-50/70 rounded-lg"
                                    >
                                        <div className="p-2 bg-blue-50 rounded-full">
                                            <IconComponent className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{action}</p>
                                            <span className="text-indigo-600">{activity.item}</span>
                                            <p className="text-xs text-slate-500">
                                                {formatDistanceToNow(new Date(activity.time), {
                                                    addSuffix: true,
                                                    locale: pl,
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
