"use client";

import SetTile from "@/components/data-display/SetTile";
import TabHeader from "@/components/layout/TabHeader";
import {useCollectionSets} from "@/features/game/use-game";

export default function CollectionPage() {
    const {data: sets, isLoading, error} = useCollectionSets();

    if (isLoading) return <p>Ładowanie...</p>;
    if (error) return <p>Błąd: {error.message}</p>;

    return (
        <div
            className={"overflow-x-hidden flex flex-col pb-32 bg-gradient-to-br from-white via-blue-50/30 to-slate-50"}
        >
            <TabHeader
                title={"Twój indeks kart"}
                description={"Kliknij w paczkę, by zobaczyć swój postęp w zbieraniu kart!"}
            />
            <div className={"flex gap-10 md:gap-20 flex-wrap justify-center px-6 md:px-16 lg:px-32 mt-12"}>
                {sets?.map((set) => (
                    <SetTile key={set.id} {...set} />
                ))}
            </div>
        </div>
    );
}
