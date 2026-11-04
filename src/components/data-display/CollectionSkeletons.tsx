import {LoadingRegion, Skeleton} from "@/components/ui/skeleton";

const PLACEHOLDER_SETS = Array.from({length: 15}, (_, index) => index);
const PLACEHOLDER_CARDS = Array.from({length: 18}, (_, index) => index);

export const SET_GRID = "grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-5";
export const CARD_GRID = "grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

export function SetGridSkeleton() {
    return (
        <LoadingRegion className={SET_GRID}>
            {PLACEHOLDER_SETS.map((index) => (
                <Skeleton key={index} className="h-56 rounded-tile md:h-64" />
            ))}
        </LoadingRegion>
    );
}

export function CardGridSkeleton() {
    return (
        <LoadingRegion className={CARD_GRID}>
            {PLACEHOLDER_CARDS.map((index) => (
                <div key={index} className="flex flex-col gap-2">
                    <Skeleton className="aspect-[245/342] rounded-[14px]" />
                    <Skeleton className="h-4 w-3/4 rounded-full" />
                    <Skeleton className="h-3 w-1/2 rounded-full" />
                </div>
            ))}
        </LoadingRegion>
    );
}
