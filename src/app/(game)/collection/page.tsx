"use client";

import {SET_GRID, SetGridSkeleton} from "@/components/data-display/CollectionSkeletons";
import SetTile from "@/components/data-display/SetTile";
import PageHeader from "@/components/layout/PageHeader";
import {ErrorState} from "@/components/ui/states";
import {useCollectionSets} from "@/features/game/use-game";
import {formatNumber} from "@/lib/format";

export default function CollectionPage() {
    const {data: sets, error, refetch} = useCollectionSets();

    const collected = sets?.reduce((sum, set) => sum + set.collected, 0) ?? 0;
    const total = sets?.reduce((sum, set) => sum + set.total, 0) ?? 0;

    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            <PageHeader
                title="Twój indeks kart"
                description="Kliknij w paczkę, by zobaczyć swój postęp w zbieraniu kart!"
                tone="sun"
            >
                {sets && (
                    <p className="font-display text-lg font-bold tabular-nums">
                        {formatNumber(collected)} z {formatNumber(total)}
                    </p>
                )}
            </PageHeader>

            {sets ? (
                <div className={SET_GRID}>
                    {sets.map((set) => (
                        <SetTile key={set.id} {...set} />
                    ))}
                </div>
            ) : error ? (
                <ErrorState message={error.message} onRetry={() => void refetch()} />
            ) : (
                <SetGridSkeleton />
            )}
        </div>
    );
}
