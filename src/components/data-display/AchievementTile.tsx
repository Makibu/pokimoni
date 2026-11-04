"use client";

import {CheckCircle, Gift, Star} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {useClaimAchievement} from "@/features/game/use-game";
import {cn} from "@/lib/utils";
import type {AchievementView} from "@/server/services/progress";

const RARITY_LABELS = {common: "Zwykłe", rare: "Rzadkie", epic: "Epickie"};

const PACK_TIER_NAMES = {1: "zwykła", 2: "średnia", 3: "najlepsza"} as const;

function rewardText(reward: AchievementView["reward"]): string {
    if ("coins" in reward) return `${reward.coins} monet`;
    return `Darmowa paczka (${PACK_TIER_NAMES[reward.packTier]}) × ${reward.quantity}`;
}

export default function AchievementTile({id, title, description, rarity, reward, unlocked, claimed}: AchievementView) {
    const claim = useClaimAchievement();
    const readyToClaim = unlocked && !claimed;

    function claimAchievement() {
        claim.mutate(id, {
            onSuccess: () => toast.success("Nagroda odebrana!"),
            onError: (error) => toast.error(error.message),
        });
    }

    return (
        <article
            className={cn(
                "flex flex-col gap-3 rounded-tile p-5",
                readyToClaim ? "bg-pink" : claimed ? "bg-secondary" : "bg-card",
            )}
        >
            <div className="flex items-start gap-3">
                <div
                    className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-full",
                        readyToClaim ? "bg-ink text-ink-foreground" : "bg-lilac",
                    )}
                >
                    {claimed ? (
                        <CheckCircle aria-hidden="true" className="size-5" />
                    ) : (
                        <Star aria-hidden="true" className="size-5" />
                    )}
                </div>
                <div className="min-w-0">
                    <h2 className="font-bold">{title}</h2>
                    <p className="text-xs font-semibold text-muted-foreground">{RARITY_LABELS[rarity]}</p>
                </div>
            </div>

            <p className="text-sm">{description}</p>

            <p className="mt-auto flex items-center gap-2 text-sm font-semibold">
                <Gift aria-hidden="true" className="size-4 shrink-0" />
                <span>Nagroda: {rewardText(reward)}</span>
            </p>

            {readyToClaim ? (
                <Button variant="ink" className="w-full" onClick={claimAchievement} disabled={claim.isPending}>
                    {claim.isPending ? "Odbieranie..." : "Odbierz nagrodę"}
                </Button>
            ) : (
                <Button disabled variant="secondary" className="w-full">
                    {claimed ? "Odebrane" : "W trakcie..."}
                </Button>
            )}
        </article>
    );
}
