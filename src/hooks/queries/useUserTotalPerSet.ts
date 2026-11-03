"use client"

import {useQuery} from "@tanstack/react-query";
import {useEffect, useState} from "react";

interface UserSetStats {
    [setId: string]: number;
}

export const useUserTotalPerSet = () => {
    const [uid, setUid] = useState<string | null>(null)

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const storedUid = user.uid
        if (storedUid) setUid(storedUid)
    }, [])

    return useQuery<UserSetStats, Error>({
        queryKey: ["userSetStats", uid],
        queryFn: async () => {
            const res = await fetch(`/api/user/sets/total?uid=${uid}`);
            if (!res.ok) throw new Error("Nie udało się pobrać statystyk użytkownika");
            const data = await res.json();
            return data.setsCount;
        },
        enabled: !!uid,
    });
};
