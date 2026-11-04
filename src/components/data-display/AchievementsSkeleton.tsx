import {LoadingRegion, Skeleton} from "@/components/ui/skeleton";

const PLACEHOLDERS = Array.from({length: 9}, (_, index) => index);

export const ACHIEVEMENT_GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

export function AchievementsSkeleton() {
    return (
        <LoadingRegion className={ACHIEVEMENT_GRID}>
            {PLACEHOLDERS.map((index) => (
                <div key={index} className="flex flex-col gap-3 rounded-tile bg-card p-5">
                    <div className="flex items-center gap-3">
                        <Skeleton className="size-11 shrink-0 rounded-full" />
                        <div className="flex flex-1 flex-col gap-1.5">
                            <Skeleton className="h-4 w-3/4 rounded-full" />
                            <Skeleton className="h-3 w-1/3 rounded-full" />
                        </div>
                    </div>
                    <Skeleton className="h-10 rounded-sm" />
                    <Skeleton className="h-4 w-2/3 rounded-full" />
                    <Skeleton className="h-11 rounded-full" />
                </div>
            ))}
        </LoadingRegion>
    );
}
