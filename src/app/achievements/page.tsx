"use client";

import TabHeader from "@/components/layout/TabHeader";
import AchievementTile from "@/components/data-display/AchievementTile";
import {useAchievements} from "@/features/game/use-game";

export default function AchievementsPage() {
    const {data: achievements, isLoading, error} = useAchievements();

    if (isLoading) return <p>Ładowanie...</p>;
    if (error) return <p>Błąd: {error.message}</p>;

    return (
        <div className="overflow-x-hidden flex flex-col pb-32 bg-gradient-to-br from-white via-blue-50/30 to-slate-50">
            <TabHeader title="Osiągnięcia" description="Wykonuj wyzwania i odbieraj nagrody!" />
            <div className="flex gap-8 flex-wrap justify-center px-6 md:px-24 lg:px-32 mt-12">
                {achievements?.map((achievement) => (
                    <AchievementTile key={achievement.id} {...achievement} />
                ))}
            </div>
        </div>
    );
}
