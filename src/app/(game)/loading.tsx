import HomeTiles from "@/components/home/HomeTiles";
import {IncomeStageSkeleton} from "@/components/home/IncomeStage";
import {DailyPackSkeleton} from "@/components/shop/DailyPackCard";
import {DailyRewardSkeleton} from "@/components/shop/DailyRewardCard";

export default function HomeLoading() {
    return (
        <div className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:gap-5">
            <IncomeStageSkeleton />
            <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
                <DailyRewardSkeleton />
                <DailyPackSkeleton className="flex-1" />
                <HomeTiles />
            </div>
        </div>
    );
}
