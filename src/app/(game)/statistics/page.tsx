"use client";

import {formatDistanceToNow} from "date-fns";
import {pl} from "date-fns/locale";
import {Award, Star, Trophy} from "lucide-react";
import {badgeIcons} from "@/components/data-display/badge-icons";
import {StatisticsSkeleton} from "@/components/data-display/StatisticsSkeleton";
import PageHeader from "@/components/layout/PageHeader";
import {LoadedImage} from "@/components/ui/loaded-image";
import {ProgressBar} from "@/components/ui/progress-bar";
import {ErrorState} from "@/components/ui/states";
import {RARITIES} from "@/domain/rarity";
import {useStatistics} from "@/features/game/use-game";
import {formatNumber, polishPlural} from "@/lib/format";
import {cn} from "@/lib/utils";

const activityLabels = {
    card: {action: "Zdobyto kartę", icon: Star},
    achievement: {action: "Ukończono osiągnięcie", icon: Trophy},
    badge: {action: "Zdobyto odznakę", icon: Award},
};

const PANEL = "flex flex-col gap-4 rounded-section bg-card p-5 md:p-6";
const CENTERED_BODY = "flex flex-1 flex-col items-center justify-center gap-4";

function PanelTitle({children}: {children: React.ReactNode}) {
    return <h2 className="font-display text-base font-bold md:text-lg">{children}</h2>;
}

function StatTile({tone, label, value, total}: {tone: string; label: string; value: number; total?: number}) {
    return (
        <div className={cn("flex flex-col gap-1 rounded-tile p-4 last:col-span-2 lg:last:col-span-1", tone)}>
            <p className="font-display text-xl font-bold tabular-nums md:text-2xl">
                {formatNumber(value)}
                {total !== undefined && <span className="font-sans text-sm font-medium"> z {formatNumber(total)}</span>}
            </p>
            <p className="text-sm font-medium">{label}</p>
        </div>
    );
}

export default function StatisticsPage() {
    const {data: stats, error, refetch} = useStatistics();

    const header = (
        <PageHeader
            title="Twoje statystyki"
            description="Przegląd Twoich postępów i osiągnięć w kolekcjonowaniu"
            tone="aqua"
        />
    );

    if (!stats) {
        return (
            <div className="flex flex-col gap-4 lg:gap-6">
                {header}
                {error ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : <StatisticsSkeleton />}
            </div>
        );
    }

    const rarityStats = [...RARITIES].reverse().map((rarity) => {
        const count = stats.copiesByRarity[rarity] ?? 0;
        return {rarity, count, percent: stats.totalCards > 0 ? Math.round((count / stats.totalCards) * 100) : 0};
    });
    const earnedBadges = stats.badges.filter((badge) => badge.earned).length;

    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            {header}

            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
                <StatTile
                    tone="bg-lilac"
                    label="Unikatowe karty"
                    value={stats.uniqueCards}
                    total={stats.catalogCards}
                />
                <StatTile tone="bg-sun" label="Wszystkie karty" value={stats.totalCards} />
                <StatTile tone="bg-aqua" label="Paczki" value={stats.packsOpened} />
                <StatTile
                    tone="bg-pink"
                    label="Osiągnięcia"
                    value={stats.achievementsUnlocked}
                    total={stats.achievementsTotal}
                />
                <StatTile tone="bg-peach" label="Odznaki" value={earnedBadges} total={stats.badges.length} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <section className={PANEL}>
                    <PanelTitle>Rozkład rzadkości</PanelTitle>
                    <ul className="flex flex-col gap-2.5">
                        {rarityStats.map(({rarity, count, percent}) => (
                            <li key={rarity} className="flex flex-col gap-1">
                                <div className="flex items-baseline justify-between gap-3 text-sm">
                                    <span className="font-medium capitalize">{rarity}</span>
                                    <span className="font-semibold tabular-nums">
                                        {count} <span className="font-medium text-muted-foreground">({percent}%)</span>
                                    </span>
                                </div>
                                <ProgressBar value={percent} max={100} />
                            </li>
                        ))}
                    </ul>
                </section>

                <div className="grid gap-4 md:grid-cols-2">
                    <section className={cn(PANEL, "items-center text-center")}>
                        <PanelTitle>Ulubiona paczka</PanelTitle>
                        {stats.favoriteSet ? (
                            <div className={CENTERED_BODY}>
                                <div className="w-full rounded-md bg-white p-3">
                                    <LoadedImage
                                        key={stats.favoriteSet.logo}
                                        src={stats.favoriteSet.logo}
                                        alt=""
                                        width={240}
                                        height={120}
                                        fit="contain"
                                        className="h-24 w-full rounded-sm"
                                    />
                                </div>
                                <div>
                                    <p className="font-bold">{stats.favoriteSet.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Otwarta {stats.favoriteSet.opened}{" "}
                                        {polishPlural(stats.favoriteSet.opened, "raz", "razy", "razy")}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Otwórz swoją pierwszą paczkę, by ją wyświetlić!
                            </p>
                        )}
                    </section>

                    <section className={cn(PANEL, "items-center text-center")}>
                        <PanelTitle>Najlepszy Pokémon</PanelTitle>
                        {stats.bestCard ? (
                            <div className={CENTERED_BODY}>
                                <div className="holo-rim w-36 rounded-[16px] p-1">
                                    <LoadedImage
                                        key={stats.bestCard.imageSmall}
                                        src={stats.bestCard.imageSmall}
                                        alt={stats.bestCard.name}
                                        width={245}
                                        height={342}
                                        className="aspect-[245/342] rounded-[12px]"
                                    />
                                </div>
                                <div>
                                    <p className="font-bold">{stats.bestCard.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        <span className="capitalize">{stats.bestCard.rarity}</span>, +
                                        {stats.bestCard.income}/h
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Otwórz pierwszą paczkę, by zdobyć swojego Pokémona!
                            </p>
                        )}
                    </section>
                </div>
            </div>

            <section className={PANEL}>
                <PanelTitle>Gablota odznak</PanelTitle>
                <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                    {stats.badges.map((badge) => {
                        const Icon = badgeIcons[badge.icon] ?? Award;
                        return (
                            <li
                                key={badge.id}
                                className={cn(
                                    "flex flex-col items-center gap-1.5 rounded-lg p-3 text-center",
                                    badge.earned ? "bg-sun" : "bg-secondary text-muted-foreground",
                                )}
                            >
                                <Icon aria-hidden="true" className="size-6" />
                                <p className="text-sm font-bold">{badge.name}</p>
                                <p className="text-xs">{badge.description}</p>
                                <span className="sr-only">{badge.earned ? "Zdobyta" : "Jeszcze nie zdobyta"}</span>
                            </li>
                        );
                    })}
                </ul>
            </section>

            <section className={PANEL}>
                <PanelTitle>Ostatnia aktywność</PanelTitle>
                {stats.recentActivity.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nic się jeszcze nie wydarzyło.</p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {stats.recentActivity.map((activity) => {
                            const {action, icon: Icon} = activityLabels[activity.kind];
                            return (
                                <li
                                    key={`${activity.kind}-${activity.item}-${activity.time}`}
                                    className="flex items-center gap-3 rounded-lg bg-secondary p-3"
                                >
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lilac">
                                        <Icon aria-hidden="true" className="size-4" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium">{action}</p>
                                        <p className="font-bold">{activity.item}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(activity.time), {
                                                addSuffix: true,
                                                locale: pl,
                                            })}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}
