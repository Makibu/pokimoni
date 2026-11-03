"use client";

import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {CheckCircle, Gift, Star} from "lucide-react";
import {toast} from "sonner";
import {useClaimAchievement} from "@/features/game/use-game";
import type {AchievementView} from "@/server/services/progress";

const rarityColors = {
    common: "bg-slate-100 text-slate-700 border-slate-300",
    rare: "bg-blue-100 text-blue-700 border-blue-300",
    epic: "bg-gradient-to-r from-blue-400 to-indigo-500 text-white border-blue-400",
};

const PACK_TIER_NAMES = {1: "zwykła", 2: "średnia", 3: "najlepsza"} as const;

function rewardText(reward: AchievementView["reward"]): string {
    if ("coins" in reward) return `${reward.coins} monet`;
    return `Darmowa paczka (${PACK_TIER_NAMES[reward.packTier]}) × ${reward.quantity}`;
}

export default function AchievementTile({id, title, description, rarity, reward, unlocked, claimed}: AchievementView) {
    const claim = useClaimAchievement();

    function claimAchievement() {
        claim.mutate(id, {
            onSuccess: () => toast.success("Nagroda odebrana!"),
            onError: (error) => toast.error(error.message),
        });
    }

    return (
        <div
            className={`group transition-all duration-500 border-2 rounded-xl w-full max-w-[400px] px-6 py-4
  ${
      unlocked
          ? "border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          : "border-slate-200 bg-white/90 hover:border-blue-200"
  }
  ${claimed ? "opacity-70 grayscale" : ""}
  `}
        >
            <div className="pb-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className={`p-3 rounded-full ${
                                unlocked ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-600"
                            }`}
                        >
                            <Star className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                            <div className="flex gap-2 mt-1">
                                <Badge className={`text-xs capitalize ${rarityColors[rarity]}`}>{rarity}</Badge>
                            </div>
                        </div>
                    </div>
                    {unlocked && <CheckCircle className="h-6 w-6 text-blue-500" />}
                </div>
            </div>

            <div className="space-y-4 mt-6">
                <p className="text-slate-600 text-sm">{description}</p>

                <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Gift className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">Nagroda</span>
                    </div>
                    <p className="text-sm text-slate-600">{rewardText(reward)}</p>
                </div>

                {unlocked && !claimed ? (
                    <Button
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                        onClick={claimAchievement}
                        disabled={claim.isPending}
                    >
                        <Gift className="h-4 w-4 mr-2" />
                        {claim.isPending ? "Odbieranie..." : "Odbierz nagrodę"}
                    </Button>
                ) : (
                    <Button disabled className="w-full bg-gray-200 text-gray-500">
                        {claimed ? "Odebrane" : "W trakcie..."}
                    </Button>
                )}
            </div>
        </div>
    );
}
