import {AchievementsSkeleton} from "@/components/data-display/AchievementsSkeleton";
import PageHeader from "@/components/layout/PageHeader";

export default function AchievementsLoading() {
    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            <PageHeader title="Osiągnięcia" description="Wykonuj wyzwania i odbieraj nagrody!" tone="pink" />
            <AchievementsSkeleton />
        </div>
    );
}
