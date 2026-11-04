import {CardGridSkeleton} from "@/components/data-display/CollectionSkeletons";
import PageHeader from "@/components/layout/PageHeader";
import {Skeleton} from "@/components/ui/skeleton";

export default function SetCollectionLoading() {
    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            <Skeleton className="h-11 w-32 rounded-full" />
            <PageHeader title={<Skeleton className="h-8 w-56 rounded-full" />} tone="sun" />
            <CardGridSkeleton />
        </div>
    );
}
