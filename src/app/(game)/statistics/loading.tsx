import {StatisticsSkeleton} from "@/components/data-display/StatisticsSkeleton";
import PageHeader from "@/components/layout/PageHeader";

export default function StatisticsLoading() {
    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            <PageHeader
                title="Twoje statystyki"
                description="Przegląd Twoich postępów i osiągnięć w kolekcjonowaniu"
                tone="aqua"
            />
            <StatisticsSkeleton />
        </div>
    );
}
