"use client"

import {useQuery} from "@tanstack/react-query";
import SetTile from "@/components/data-display/SetTile";
import {SetType} from "@/lib/type";
import {useUserTotalPerSet} from "@/hooks/queries/useUserTotalPerSet";
import TabHeader from "@/components/layout/TabHeader";

export default function IndexPage() {
    const {data: setList, isLoading, error} = useQuery({
        queryKey: ["sets"],
        queryFn: async () => {
            const res = await fetch("/api/sets");
            if (!res.ok) throw new Error("Nie udało się pobrać setów");
            return res.json();
        },
    });

    const {data: userTotalPerSet} = useUserTotalPerSet();


    if (isLoading) return <p>Ładowanie...</p>;
    if (error instanceof Error) return <p>Błąd: {error.message}</p>;

    const sets = setList?.data || [];

    return (
        <div
            className={'overflow-x-hidden flex flex-col pb-32 bg-gradient-to-br from-white via-blue-50/30 to-slate-50'}>
            <TabHeader title={"Twój indeks kart"}
                       description={"Kliknij w paczkę, by zobaczyć swój postęp w zbieraniu kart!"}/>
            <div className={'flex gap-20 flex-wrap justify-center px-32 mt-12'}>
                {sets.map((set: SetType, index: number) => (
                    <SetTile key={index} {...set} totalCollected={userTotalPerSet?.[set.id] ?? 0}/>
                ))}
            </div>
        </div>
    );
}
