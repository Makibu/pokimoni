"use client"

import {Award, BarChart3, CircleQuestionMark, CoinsIcon, Crown, Package, Star, TrendingUp, Trophy} from "lucide-react"
import TabHeader from "@/components/layout/TabHeader";
import {useUserStats} from "@/hooks/queries/useUserStats";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import {Badge} from "@/components/ui/badge";
import {badges} from "@/lib/badgesData";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {formatDistanceToNow} from "date-fns";
import {pl} from "date-fns/locale";

const rarityColors = {
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

const actionIcons: Record<string, React.ElementType> = {
    "Zdobył kartę": Star,
    "Ukończył osiągnięcie": Trophy,
    "Zdobył odznakę": Award,
};

export default function StatisticsPage() {
    const {data: userStats, isLoading} = useUserStats()

    if (!userStats || isLoading) return <LoadingIndicator/>

    const earnedBadgeIds = userStats.userBadges?.map(b => b.badge_id) ?? [];

    console.log(userStats.recentActivity)

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-slate-50 relative overflow-hidden">
            <TabHeader title={"Twoje statystyki"}
                       description={"Przegląd Twoich postępów i osiągnięć w kolekcjonowaniu"}/>

            <main className="container mx-auto px-4 py-8 relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div
                        className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200 backdrop-blur-sm rounded-lg p-4 text-center">
                        <div
                            className="text-2xl font-bold text-blue-600">{userStats.total_cards}
                            <span className={'text-blue-500 text-base font-normal'}>/{userStats.cardsTotal}</span>
                        </div>
                        <p className="text-sm text-slate-600">Karty</p>
                    </div>

                    <div
                        className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-2 border-indigo-200 backdrop-blur-sm rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-indigo-600">{userStats.total_packs}</div>
                        <p className="text-sm text-slate-600">Paczki</p>
                    </div>

                    <div
                        className="bg-gradient-to-br from-sky-50 to-sky-100/50 border-2 border-sky-200 backdrop-blur-sm rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-sky-600">
                            {userStats.total_achievements}
                            <span
                                className={'text-sky-500 text-base font-normal'}>/{userStats.totalAchievementsCount}</span>
                        </div>
                        <p className="text-sm text-slate-600">Osiągnięcia</p>
                    </div>

                    <div
                        className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-2 border-yellow-200 backdrop-blur-sm rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-600">{userStats.userBadges.length}
                            <span className={'text-yellow-500 text-base font-normal'}>/{badges.length}</span>
                        </div>
                        <p className="text-sm text-slate-600">Odznak</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-8">
                    <div className="bg-white/90 backdrop-blur-sm border-2 border-blue-100 rounded-lg p-6">
                        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                            <BarChart3 className="h-5 w-5 text-blue-600"/>
                            Rozkład Rzadkości
                        </h3>
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {userStats.rarityStats.map(({rarity, count, percent}: {
                                rarity: string,
                                count: number,
                                percent: number
                            }) => (
                                <div key={rarity} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-sm capitalize">{rarity}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">{count}</span>
                                            <Badge
                                                className="bg-blue-50 text-blue-700 text-xs">{percent}%</Badge>
                                        </div>
                                    </div>
                                    <div className="w-full rounded-full h-1.5 bg-slate-100">
                                        <div
                                            className="h-1.5 rounded-full"
                                            style={{
                                                width: `${percent}%`,
                                                backgroundColor: rarityColors[rarity as keyof typeof rarityColors],
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="gap-4 grid grid-cols-2">
                        <div
                            className="bg-white/90 backdrop-blur-sm border-2 border-blue-100 rounded-lg p-6 relative flex flex-col items-center">
                            <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                                <Package className="h-5 w-5 text-indigo-600"/>
                                Ulubiona Paczka
                            </h3>
                            {userStats.favoritePack ? (
                                <>
                                    <img src={userStats.favoritePack.images.logo} alt={userStats.favoritePack.name}
                                         className={'p-8'}/>
                                    <div className="text-center absolute bottom-4">
                                        <div
                                            className="text-xl font-bold text-indigo-600 mb-1">{userStats.favoritePack?.name}</div>
                                        <p className="text-sm text-slate-500">Otwarta {userStats.favoritePack?.opened} razy</p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center absolute bottom-4">
                                    <div
                                        className="text-xl font-bold text-indigo-600 mb-1">Brak
                                    </div>
                                    <p className="text-sm text-slate-500 px-12">Otwórz swoją pierwszą paczkę, by ją
                                        wyświetlić!</p>
                                </div>
                            )}
                        </div>

                        <div
                            className="bg-white/90 backdrop-blur-sm border-2 border-blue-100 rounded-lg p-6 relative flex flex-col items-center">
                            <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                                <Crown className="h-5 w-5 text-yellow-600"/>
                                Najlepszy Pokémon
                            </h3>
                            {userStats.bestCard ?
                                (
                                    <>
                                        <img src={userStats.bestCard.images?.large} alt={userStats.bestCard.name}
                                             className={"px-16"}/>
                                        <div className="text-center absolute bottom-4">
                                            <div
                                                className="text-xl font-bold text-yellow-600 mb-1">{userStats.bestCard.name}</div>
                                            <p className="text-sm text-slate-500">{userStats.bestCard.rarity} - {userStats.bestCard.income}
                                                <CoinsIcon className={'inline-block w-3 ml-1'}/></p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center absolute bottom-4">
                                        <div
                                            className="text-xl font-bold text-yellow-600 mb-1">Brak
                                        </div>
                                        <div className={'text-sm text-slate-500 px-12'}>
                                            Otwórz pierwszą paczkę by zdobyć swojego pokemona!
                                        </div>
                                    </div>
                                )
                            }
                        </div>
                    </div>

                    <div className="bg-white/90 backdrop-blur-sm border-2 border-blue-100 rounded-lg p-6 col-span-2">
                        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                            <Award className="h-5 w-5 text-orange-600"/>
                            Gablota Odznak
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            {badges.map((badge, index) => {
                                const IconComponent = badge.icon

                                const isEarned = earnedBadgeIds.includes(Number(badge.id));

                                return (
                                    <div
                                        key={index}
                                        className={`p-3 rounded-lg relative text-center ${isEarned ? "bg-orange-50 border border-orange-200" : "bg-slate-50 border border-slate-200 opacity-50"}`}
                                    >
                                        <IconComponent
                                            className={`h-6 w-6 mx-auto mb-1 ${isEarned ? "text-orange-600" : "text-slate-400"}`}
                                        />
                                        <p className="text-xs font-medium">{badge.name}</p>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <CircleQuestionMark
                                                    className={`absolute top-2 right-2 ${isEarned ? "text-orange-600" : "text-slate-400"}`}/>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{badge.description}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="bg-white/90 backdrop-blur-sm border-2 border-blue-100 rounded-lg p-6 lg:col-span-2">
                        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                            <TrendingUp className="h-5 w-5 text-blue-600"/>
                            Ostatnia Aktywność
                        </h3>
                        <div className="space-y-4">
                            {userStats.recentActivity.map((activity, index) => {
                                const IconComponent = actionIcons[activity.action] ?? Star;
                                return (
                                    <div key={index} className="flex items-center gap-4 p-3 bg-slate-50/70 rounded-lg">
                                        <div className="p-2 bg-blue-50 rounded-full">
                                            <IconComponent className="h-4 w-4 text-blue-600"/>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">
                                                {activity.action} <span
                                                className="text-indigo-600">{activity.item}</span>
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {formatDistanceToNow(new Date(activity.time), {
                                                    addSuffix: true,
                                                    locale: pl
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
    )
}
