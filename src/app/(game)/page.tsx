import DailySection from "@/components/daily/DailySection";
import HomeExtras from "@/components/home/HomeExtras";
import HomeTiles from "@/components/home/HomeTiles";
import IncomeStage from "@/components/home/IncomeStage";
import DailyPackCard from "@/components/shop/DailyPackCard";
import DailyRewardCard from "@/components/shop/DailyRewardCard";

export default function HomePage() {
    return (
        <div className="flex flex-col gap-4 lg:gap-5">
            <div className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:gap-5">
                <IncomeStage />
                <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
                    <DailyRewardCard />
                    <DailyPackCard className="flex-1" />
                    <HomeTiles />
                </div>
            </div>
            <DailySection />
            <HomeExtras />
        </div>
    );
}
