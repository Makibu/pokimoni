"use client";

import {Coins} from "lucide-react";
import {useUserCoins} from "@/hooks/queries/useUserCoins";
import {useUserSlotIncome} from "@/hooks/queries/useUserSlotsIncome";
import {useEffect} from "react";
import {useQueryClient} from "@tanstack/react-query";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";

export default function Balance() {
    const {coins} = useUserCoins();
    const {data: slotsData} = useUserSlotIncome();
    const queryClient = useQueryClient();

    useEffect(() => {
        const now = new Date();
        const msToNextHour = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000;

        const timeout = setTimeout(() => {
            queryClient.invalidateQueries({queryKey: ["coins"]});
            setInterval(
                () => {
                    queryClient.invalidateQueries({queryKey: ["coins"]});
                },
                60 * 60 * 1000,
            );
        }, msToNextHour);

        return () => {
            clearTimeout(timeout);
        };
    }, [queryClient]);

    return (
        <div
            className={
                "flex justify-center items-center gap-1 bg-white/80 rounded-xl pl-4 pr-3 shadow-sm h-fit py-1 backdrop-blur-md border-[1px] border-blue-200"
            }
        >
            <Coins className={"text-yellow-500 h-5"} />
            <span>{coins ?? 0}</span>
            {coins >= 1000 ? (
                <span className={"text-[12px] text-red-500"}>
                    <Tooltip>
                        <TooltipTrigger>+0/h</TooltipTrigger>
                        <TooltipContent>Osiągnięto limit 1000 monet ;c</TooltipContent>
                    </Tooltip>
                </span>
            ) : (
                <span className={"text-[12px] text-green-500"}>+{slotsData?.income}/h</span>
            )}
        </div>
    );
}
