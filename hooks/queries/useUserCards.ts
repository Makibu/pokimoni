import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useEffect, useState} from "react";
import {UserCardWithCard} from "@/lib/types";

export const useUserCards = (setId?: string) => {
    const [uid, setUid] = useState<string | null>(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const storedUid = user.uid;
        if (storedUid) setUid(storedUid);
    }, []);

    const query = useQuery<UserCardWithCard[], Error>({
        queryKey: ["userCards", uid, setId],
        queryFn: async () => {
            if (!uid) throw new Error("Brak uid");
            const url = new URL("/api/user/cards", window.location.origin);
            url.searchParams.append("uid", uid);
            if (setId) url.searchParams.append("setId", setId);

            const res = await fetch(url.toString());
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error || "Błąd pobierania kart użytkownika");
            return data.userCards as UserCardWithCard[];
        },
        enabled: !!uid,
    });

    const mutation = useMutation({
        mutationFn: async ({
                               cards,
                               set_id,
                           }: {
            cards: { card_id: string; quantity: number }[];
            set_id?: string;
        }) => {
            if (!uid) throw new Error("Brak uid");
            const res = await fetch("/api/user/cards", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({uid, cards, set_id}),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Błąd aktualizacji kart");
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["userCards", uid, setId]});
            queryClient.invalidateQueries({queryKey: ["userStats", uid]});
        },
    });

    return {
        ...query,
        updateUserCards: mutation.mutateAsync,
        isUpdating: mutation.isPending,
    };
};
