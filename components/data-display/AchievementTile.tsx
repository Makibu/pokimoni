'use client'

import React, {useEffect, useState} from "react";
import {CheckCircle, Gift, Star} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {useUserCoins} from "@/hooks/queries/useUserCoins";
import {toast} from "sonner";
import {useQueryClient} from "@tanstack/react-query";

const rarityColors = {
    common: "bg-slate-100 text-slate-700 border-slate-300",
    rare: "bg-blue-100 text-blue-700 border-blue-300",
    epic: "bg-gradient-to-r from-blue-400 to-indigo-500 text-white border-blue-400",
}

export default function AchievementTile({title, id, description, rarity, reward, isCompleted, claimed}: {
    title: string,
    id: number,
    description: string,
    rarity: string,
    amount: number,
    reward: string[],
    isCompleted: boolean,
    claimed: boolean,
}) {
    const [uid, setUid] = useState<string | null>(null)
    const queryClient = useQueryClient()

    const [claimLoading, setClaimLoading] = useState(false)

    const {updateCoins} = useUserCoins()

    const rewardText = reward[0];
    const match = rewardText.match(/\d+/);
    const amount = match ? parseInt(match[0], 10) : 0;

    useEffect(() => {
        const storedUid = JSON.parse(localStorage.getItem('user') || '{}').uid
        if (storedUid) setUid(storedUid)
    }, [])

    async function claimAchievement() {
        if (claimLoading) return
        setClaimLoading(true)
        try {
            await fetch(`/api/user/achievements/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uid: uid,
                    achievement_id: Number(id),
                }),
            })

            await updateCoins({type: "achievement", amount: amount})


            toast.success("Nagroda odebrana!")
        } catch {
            toast.error("Coś poszło nie tak przy odbiorze")
        } finally {
            queryClient.invalidateQueries({queryKey: ["achievements", uid]})
            queryClient.invalidateQueries({queryKey: ["achievementsNotification", uid]})
            setClaimLoading(false)
        }

    }

    return (
        <div
            className={`group transition-all duration-500 border-2 rounded-xl w-[400px] px-6 py-4
  ${isCompleted
                ? "border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                : "border-slate-200 bg-white/90 hover:border-blue-200"}
  ${claimed ? "opacity-70 grayscale" : ""}
  `}
        >
            <div className="pb-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className={`p-3 rounded-full ${
                                isCompleted ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-600"
                            }`}
                        >
                            <Star className="h-6 w-6"/>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                            <div className="flex gap-2 mt-1">
                                <Badge
                                    className={`text-xs capitalize ${rarityColors[rarity as keyof typeof rarityColors]}`}>
                                    {rarity}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    {isCompleted && <CheckCircle className="h-6 w-6 text-blue-500"/>}
                </div>
            </div>

            <div className="space-y-4 mt-6">
                <p className="text-slate-600 text-sm">{description}</p>

                {/*<div className="space-y-2 text-green-700">*/}
                {/*    <div className="flex justify-between text-sm">*/}
                {/*        <span className="font-medium">Postęp</span>*/}
                {/*        <span className="font-bold">*/}
                {/*        0/{amount}*/}
                {/*      </span>*/}
                {/*    </div>*/}
                {/*    <Progress value={0.4} max={amount}*/}
                {/*              className="h-2 bg-green-500/20 [&_[data-slot=progress-indicator]]:bg-green-700"/>*/}
                {/*    <div*/}
                {/*        className="text-xs text-slate-500 text-right">{Math.round(0.4 / amount * 100)}%*/}
                {/*        ukończone*/}
                {/*    </div>*/}
                {/*</div>*/}

                {/* Reward */}
                <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Gift className="h-4 w-4 text-blue-600"/>
                        <span className="text-sm font-medium text-blue-700">Nagroda</span>
                    </div>
                    <p className="text-sm text-slate-600">{...reward}</p>
                </div>

                {isCompleted && !claimed ? (
                    <Button
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                        onClick={claimAchievement}
                    >
                        <Gift className="h-4 w-4 mr-2"/>
                        {claimLoading ? "Odbieranie..." : "Odbierz nagrodę"}
                    </Button>
                ) : (
                    <Button disabled className="w-full bg-gray-200 text-gray-500">
                        {claimed ? "Odebrane" : "W trakcie..."}
                    </Button>
                )}
            </div>
        </div>
    )
}