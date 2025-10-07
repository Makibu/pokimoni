import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useEffect, useState} from "react";

type SudokuData = {
    sudoku_flag: boolean;
};

export const useUserMinigames = () => {
    const queryClient = useQueryClient();
    const [uid, setUid] = useState<string | null>(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const storedUid = user.uid;
        if (storedUid) setUid(storedUid);
    }, []);

    const {data, isLoading, error} = useQuery<SudokuData>({
        queryKey: ["minigames", uid],
        queryFn: async () => {
            const res = await fetch(`/api/user/sudoku?uid=${uid}`);
            if (!res.ok) throw new Error("Failed to fetch data");
            return res.json();
        },
        enabled: !!uid,
    });


    const mutation = useMutation<SudokuData, Error>({
        mutationFn: async () => {
            if (!uid) throw new Error("Brak uid");

            const res = await fetch(`/api/user/sudoku`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({uid}),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to update sudoku flag");
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["minigames", uid]});
            queryClient.refetchQueries({queryKey: ["minigames", uid]});
        },
    });

    return {
        sudokuAvailable: data ? !data.sudoku_flag : false,
        isLoading,
        error,
        updateSudokuFlag: mutation.mutateAsync,
    };
};
