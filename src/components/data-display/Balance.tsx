"use client";

import {Coins} from "lucide-react";
import {usePlayer} from "@/features/game/use-game";

export default function Balance() {
    const {data: player} = usePlayer();

    return (
        <div
            className={
                "flex justify-center items-center gap-1 bg-white/80 rounded-xl pl-4 pr-3 shadow-sm h-fit py-1 backdrop-blur-md border-[1px] border-blue-200"
            }
        >
            <Coins className={"text-yellow-500 h-5"} />
            <span>{player?.coins ?? 0}</span>
            <span className={"text-[12px] text-green-500"}>+{player?.piggyBank.incomePerHour ?? 0}/h</span>
        </div>
    );
}
