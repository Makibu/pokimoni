import {LoadingRegion, Skeleton} from "@/components/ui/skeleton";

const STAT_TILES = [1, 2, 3, 4, 5];

export function StatisticsSkeleton() {
    return (
        <LoadingRegion className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
                {STAT_TILES.map((tile) => (
                    <Skeleton key={tile} className="h-24 rounded-tile last:col-span-2 lg:last:col-span-1" />
                ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-96 rounded-section" />
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-64 rounded-section md:h-auto" />
                    <Skeleton className="h-64 rounded-section md:h-auto" />
                </div>
            </div>
            <Skeleton className="h-64 rounded-section" />
            <Skeleton className="h-64 rounded-section" />
        </LoadingRegion>
    );
}
