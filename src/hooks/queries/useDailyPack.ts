import {useQuery} from "@tanstack/react-query";
import {DailyPack} from "@/lib/types";

export function useDailyPack() {
    return useQuery<DailyPack>({
        queryKey: ["dailyPack"],
        queryFn: async () => {
            const res = await fetch("/api/sets/random");
            if (!res.ok) throw new Error("Nie udało się pobrać paczki dnia.");
            return res.json();
        },
        staleTime: 1000 * 60 * 60,
        refetchOnWindowFocus: false,
    });
}