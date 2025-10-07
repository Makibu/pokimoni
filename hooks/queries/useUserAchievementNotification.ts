import {useQuery} from "@tanstack/react-query";
import {useEffect, useState} from "react";

export default function useUserAchievementNotification() {
    const [uid, setUid] = useState<string | null>(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const storedUid = user.uid;
        if (storedUid) setUid(storedUid);
    }, []);

    const {data} = useQuery({
        queryKey: ["achievementsNotification", uid],
        queryFn: async () => {
            const res = await fetch(`/api/user/achievements/unclaimed_notification?uid=${uid}`);
            if (!res.ok) throw new Error("Nie udało się pobrać powiadomienia");
            const json = await res.json();
            return json.has_unclaimed_achievements
        },
        enabled: !!uid
    });

    return {
        has_unclaimed_achievements: data ?? false
    };
}