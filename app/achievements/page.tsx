"use client"

import TabHeader from "@/components/layout/TabHeader";
import AchievementTile from "@/components/data-display/AchievementTile";
import {useQuery} from "@tanstack/react-query";
import {Achievement} from "@/lib/type";

export default function AchievementsPage() {
    const {data: achievements} = useQuery<Achievement[]>({
        queryKey: ["achievements"],
        queryFn: async () => {
            const res = await fetch("/api/achievements");
            if (!res.ok) throw new Error("Nie udało się pobrać osiągnięć");

            const data: { achievements: Achievement[] } = await res.json();

            return data.achievements.sort(
                (a, b) => {
                    const rarityOrder: Record<Achievement["rarity"], number> = {Common: 0, Rare: 1, Epic: 2};
                    return rarityOrder[a.rarity] - rarityOrder[b.rarity];
                }
            );
        }
    });

    return (
        <div
            className={'overflow-x-hidden flex flex-col pb-32 bg-gradient-to-br from-white via-blue-50/30 to-slate-50'}>
            <TabHeader title={"Twój indeks kart"}
                       description={"Kliknij w paczkę, by zobaczyć swój postęp w zbieraniu kart!"}/>
            <div className={'flex gap-8 flex-wrap justify-center px-32 mt-12'}>
                {achievements?.map((achievement: Achievement, index: number) => (
                    <AchievementTile key={index} title={achievement.title} description={achievement.description}
                                     rarity={achievement.rarity} type={achievement.type} amount={achievement.amount}
                                     reward={achievement.reward} isCompleted={false}/>
                ))}
            </div>
        </div>
    )
}