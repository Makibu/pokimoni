import {LoadingRegion, Skeleton} from "@/components/ui/skeleton";

export function FriendsSkeleton() {
    return (
        <LoadingRegion className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-44 rounded-section" />
            <Skeleton className="h-44 rounded-section" />
            <Skeleton className="h-64 rounded-section lg:col-span-2" />
        </LoadingRegion>
    );
}
