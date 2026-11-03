import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useEffect, useState} from "react";

type CoinsData = {
    coins: number;
    daily_coins_flag: boolean;
};

type UpdateCoinsInput = {
    type: "daily" | "minigame" | "purchase" | "achievement";
    amount: number;
};

export const useUserCoins = () => {
    const queryClient = useQueryClient();
    const [uid, setUid] = useState<string | null>(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const storedUid = user.uid;
        if (storedUid) setUid(storedUid);
    }, []);

    const {data, isLoading, error} = useQuery<CoinsData>({
        queryKey: ["coins", uid],
        queryFn: async () => {
            const res = await fetch(`/api/user/coins?uid=${uid}`);
            if (!res.ok) throw new Error("Failed to fetch coins");
            return res.json();
        },
        enabled: !!uid,
    });

    const mutation = useMutation<CoinsData, Error, UpdateCoinsInput>({
        mutationFn: async (input) => {
            const res = await fetch("/api/user/coins", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({uid, ...input}),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to update coins");
            }
            return res.json();
        },
        onSuccess: (updatedData) => {
            queryClient.setQueryData(["coins", uid], updatedData);
        },
    });

    return {
        coins: data?.coins ?? 0,
        dailyAvailable: data?.daily_coins_flag ?? false,
        isLoading,
        error,
        updateCoins: mutation.mutateAsync,
    };
};
