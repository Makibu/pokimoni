import {DailyPackSkeleton} from "@/components/shop/DailyPackCard";
import {DailyRewardSkeleton} from "@/components/shop/DailyRewardCard";
import {LoadingRegion, Skeleton} from "@/components/ui/skeleton";

const PLACEHOLDER_TIERS = [1, 2, 3];
const PLACEHOLDER_PACKS = [1, 2, 3, 4, 5];

export default function ShopSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <DailyPackSkeleton />
                <DailyRewardSkeleton />
                <Skeleton className="h-32 rounded-section md:col-span-2 lg:col-span-1 lg:h-auto" />
            </div>
            <LoadingRegion className="flex flex-col gap-6">
                {PLACEHOLDER_TIERS.map((tier) => (
                    <div key={tier} className="flex flex-col gap-3">
                        <Skeleton className="h-6 w-56 rounded-full" />
                        <div className="flex gap-3 overflow-hidden lg:grid lg:grid-cols-5">
                            {PLACEHOLDER_PACKS.map((pack) => (
                                <Skeleton key={pack} className="h-64 w-44 shrink-0 rounded-tile sm:w-52 lg:w-auto" />
                            ))}
                        </div>
                    </div>
                ))}
            </LoadingRegion>
        </div>
    );
}
