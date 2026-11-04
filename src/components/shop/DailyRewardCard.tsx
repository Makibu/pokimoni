"use client";

import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {LoadingRegion, Skeleton} from "@/components/ui/skeleton";
import {ErrorState} from "@/components/ui/states";
import {DAILY_REWARDS, MAX_STREAK_DAY} from "@/domain/economy";
import {useClaimDaily, usePlayer} from "@/features/game/use-game";
import {coinsAccusative} from "@/lib/format";
import {cn} from "@/lib/utils";

const FRAME = "flex flex-col justify-center gap-3.5 rounded-section bg-peach p-4 md:p-6";
const STREAK_DAYS = Array.from({length: MAX_STREAK_DAY}, (_, index) => index + 1);

export function DailyRewardSkeleton({className}: {className?: string}) {
    return (
        <LoadingRegion className={cn(FRAME, className)}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-6 w-28 rounded-full" />
                    <Skeleton className="h-4 w-36 rounded-full" />
                </div>
                <Skeleton className="h-11 w-36 rounded-full" />
            </div>
            <Skeleton className="h-2.5 rounded-full" />
        </LoadingRegion>
    );
}

export default function DailyRewardCard({className}: {className?: string}) {
    const {data: player, error, refetch} = usePlayer();
    const claim = useClaimDaily();

    if (!player) {
        if (error) return <ErrorState className={className} message={error.message} onRetry={() => void refetch()} />;
        return <DailyRewardSkeleton className={className} />;
    }

    const {claimable, streakDay, reward} = player.daily;
    // While a reward waits to be claimed, its day is the current one and is not completed yet.
    const completedDays = claimable ? streakDay - 1 : streakDay;
    const nextReward = DAILY_REWARDS[Math.min(streakDay, MAX_STREAK_DAY - 1)];

    function handleClaim() {
        claim.mutate(undefined, {
            onSuccess: (result) =>
                toast.success(`Odebrano ${coinsAccusative(result.reward)}! Seria: dzień ${result.streakDay}`),
            onError: (claimError) => toast.error(claimError.message),
        });
    }

    return (
        <section aria-label="Nagroda dzienna" className={cn(FRAME, className)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="font-display text-lg font-bold md:text-xl">
                        Dzień {streakDay} z {MAX_STREAK_DAY}
                    </h2>
                    <p className="text-sm font-medium">
                        {claimable ? `Następna nagroda: ${nextReward}` : `Kolejna o 10:00: ${nextReward} monet`}
                    </p>
                </div>
                <Button variant="ink" onClick={handleClaim} disabled={!claimable || claim.isPending}>
                    {claimable ? `Odbierz ${reward} monet` : "Odebrano!"}
                </Button>
            </div>
            <div role="img" aria-label={`Seria: dzień ${streakDay} z ${MAX_STREAK_DAY}`} className="flex gap-1.5">
                {STREAK_DAYS.map((day) => (
                    <div
                        key={day}
                        className={cn(
                            "h-2.5 flex-1 rounded-full",
                            day <= completedDays
                                ? "bg-ink"
                                : claimable && day === streakDay
                                  ? "bg-streak"
                                  : "bg-streak-empty",
                        )}
                    />
                ))}
            </div>
        </section>
    );
}
