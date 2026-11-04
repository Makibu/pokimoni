"use client";

import AchievementTile from "@/components/data-display/AchievementTile";
import {ACHIEVEMENT_GRID, AchievementsSkeleton} from "@/components/data-display/AchievementsSkeleton";
import PageHeader from "@/components/layout/PageHeader";
import {ErrorState} from "@/components/ui/states";
import {useAchievements} from "@/features/game/use-game";

export default function AchievementsPage() {
    const {data: achievements, error, refetch} = useAchievements();

    const unlocked = achievements?.filter((achievement) => achievement.unlocked).length ?? 0;

    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            <PageHeader title="Osiągnięcia" description="Wykonuj wyzwania i odbieraj nagrody!" tone="pink">
                {achievements && (
                    <p className="font-display text-lg font-bold tabular-nums">
                        {unlocked} z {achievements.length}
                    </p>
                )}
            </PageHeader>

            {achievements ? (
                <div className={ACHIEVEMENT_GRID}>
                    {achievements.map((achievement) => (
                        <AchievementTile key={achievement.id} {...achievement} />
                    ))}
                </div>
            ) : error ? (
                <ErrorState message={error.message} onRetry={() => void refetch()} />
            ) : (
                <AchievementsSkeleton />
            )}
        </div>
    );
}
