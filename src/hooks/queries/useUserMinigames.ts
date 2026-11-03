import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useEffect, useState} from "react";

type MinigameFlags = {
    sudoku_flag: boolean;
    minesweeper_flag: boolean;
};

export const useUserMinigames = () => {
    const queryClient = useQueryClient();
    const [uid, setUid] = useState<string | null>(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user.uid) setUid(user.uid);
    }, []);

    const {data, isLoading, error} = useQuery<MinigameFlags>({
        queryKey: ["minigames", uid],
        queryFn: async () => {
            const res = await fetch(`/api/user/minigames?uid=${uid}`);
            if (!res.ok) throw new Error("Failed to fetch minigames");
            return res.json();
        },
        enabled: !!uid,
    });

    const mutation = useMutation({
        mutationFn: async (gameName: keyof MinigameFlags) => {
            if (!uid) throw new Error("Brak uid");
            const res = await fetch(`/api/user/minigames`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({uid, gameName}),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to update flag");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["minigames", uid]});
        },
    });

    return {
        sudokuAvailable: data ? !data.sudoku_flag : false,
        minesweeperAvailable: data ? !data.minesweeper_flag : false,
        isLoading,
        error,
        updateGameFlag: mutation.mutateAsync,
    };
};
