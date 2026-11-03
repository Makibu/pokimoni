import {useQuery} from "@tanstack/react-query";
import {useEffect, useState} from "react";

type UserSlotIncome = {
    slot_1_income: number;
    slot_2_income: number;
    income: number;
};

export const useUserSlotIncome = () => {
    const [uid, setUid] = useState<string | null>(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user?.uid) setUid(user.uid);
    }, []);

    return useQuery<UserSlotIncome, Error>({
        queryKey: ["userSlotIncome", uid],
        queryFn: async () => {
            const res = await fetch(`/api/user/slots?uid=${uid}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Błąd pobierania slotów");

            const slot_1_income = data.slots?.cards_1?.income ?? 0;
            const slot_2_income = data.slots?.cards_2?.income ?? 0;

            return {
                slot_1_income,
                slot_2_income,
                income: slot_1_income + slot_2_income,
            };
        },
        enabled: !!uid,
    });
};