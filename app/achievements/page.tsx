"use client"

import TabHeader from "@/components/layout/TabHeader";
import AchievementTile from "@/components/data-display/AchievementTile";
import {useQuery} from "@tanstack/react-query";
import {Achievement, AchievementWithUserData} from "@/lib/types";
import {useEffect, useState} from "react";

export default function AchievementsPage() {
    const [uid, setUid] = useState<string | null>(null)

    // Pobranie wszystkich achievementów
    const {data: achievements, isLoading, error} = useQuery<Achievement[]>({
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

    // Pobranie UID użytkownika
    useEffect(() => {
        const storedUid = JSON.parse(localStorage.getItem('user') || '{}').uid;
        if (storedUid) setUid(storedUid);
    }, [])

    // Pobranie achievementów użytkownika
    const {data: userAchievements} = useQuery({
        queryKey: ["achievements", uid],
        queryFn: async () => {
            if (!uid) return {userAchievements: []};
            const response = await fetch(`/api/user/achievements?uid=${uid}`)
            return response.json();
        },
        enabled: !!uid,
    })

    const userAchievementsArray = userAchievements?.userAchievements ?? [];

    const achievementsWithUserData = achievements?.map((ach) => {
        const userAch = userAchievementsArray.find(
            (ua: { achievement_id: number; claimed_flag: boolean }) => ua.achievement_id === ach.id
        );
        return {
            ...ach,
            isCompleted: !!userAch,
            claimed_flag: userAch?.claimed_flag ?? false,
        };
    });

    if (isLoading) return <p>Ładowanie...</p>;
    if (error instanceof Error) return <p>Błąd: {error.message}</p>;

    return (
        <div className="overflow-x-hidden flex flex-col pb-32 bg-gradient-to-br from-white via-blue-50/30 to-slate-50">
            <TabHeader title="Twój indeks kart"
                       description="Kliknij w paczkę, by zobaczyć swój postęp w zbieraniu kart!"/>
            <div className="flex gap-8 flex-wrap justify-center px-12 md:px-24 lg:px-32 mt-12">
                {achievementsWithUserData?.map((achievement: AchievementWithUserData, index: number) => (
                    <AchievementTile
                        key={index}
                        title={achievement.title}
                        id={achievement.id}
                        description={achievement.description}
                        rarity={achievement.rarity}
                        amount={achievement.amount}
                        reward={achievement.reward}
                        isCompleted={achievement.isCompleted}
                        claimed={achievement.claimed_flag}
                    />
                ))}
            </div>
        </div>
    )
}
