import {useQuery} from "@tanstack/react-query";

export default function useSets() {
    const {data: setList, isLoading, error} = useQuery({
        queryKey: ["sets"],
        queryFn: async () => {
            const res = await fetch("/api/sets");
            if (!res.ok) throw new Error("Nie udało się pobrać setów");
            return res.json();
        },
    });

    return {
        isLoading,
        error,
        setList: setList?.data || [],
    };
}