"use client";

import {Skeleton} from "@/components/ui/skeleton";
import {usePlayer} from "@/features/game/use-game";
import {formatNumber} from "@/lib/format";

export default function Balance() {
    const {data: player} = usePlayer();

    if (!player) return <Skeleton className="h-6 w-28 rounded-full" />;

    return (
        <div className="flex items-baseline gap-1.5 sm:px-3">
            <span className="font-display text-lg font-bold tabular-nums sm:text-base sm:font-medium">
                {formatNumber(player.coins)}
            </span>
            <span className="sr-only">monet, dochód</span>
            <span className="text-[13px] font-semibold text-income">+{player.piggyBank.incomePerHour}/h</span>
        </div>
    );
}
