"use client";

import {ArrowLeftRight} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {LoadedImage} from "@/components/ui/loaded-image";
import {MAX_CARD_COPIES} from "@/domain/economy";
import {useAnswerTrade} from "@/features/social/use-social";
import {cn} from "@/lib/utils";
import type {TradeCard, TradeView} from "@/server/services/trades";

function OfferCard({label, card, compact}: {label: string; card: TradeCard; compact: boolean}) {
    return (
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
            <p className="text-xs font-bold">{label}</p>
            <LoadedImage
                src={card.imageSmall}
                alt={card.name}
                width={245}
                height={342}
                className={cn("aspect-[245/342] rounded-[8px]", compact ? "w-20" : "w-24 sm:w-28")}
            />
            <p className="w-full truncate text-sm font-bold" title={card.name}>
                {card.name}
            </p>
            <p className="w-full truncate text-xs capitalize">{card.rarity}</p>
        </div>
    );
}

/** An open offer with the sides named from the viewer's point of view, and what the viewer can do with it. */
export default function TradeOffer({trade, compact = false}: {trade: TradeView; compact?: boolean}) {
    const answer = useAnswerTrade();
    const [given, received] = trade.incoming ? [trade.requested, trade.offered] : [trade.offered, trade.requested];
    const isOpen = trade.status === "pending";

    function respond(kind: "accept" | "reject" | "cancel") {
        answer.mutate(
            {id: trade.id, answer: kind},
            {
                onSuccess: ({lostCard, earned}) => {
                    if (kind === "accept") {
                        toast.success(
                            lostCard
                                ? `Wymiana gotowa. Masz już ${MAX_CARD_COPIES} egzemplarzy otrzymanej karty, więc przepadła`
                                : "Wymiana gotowa",
                        );
                    }
                    const rewards = [
                        ...(earned?.achievements.map((achievement) => achievement.title) ?? []),
                        ...(earned?.badges.map((badge) => badge.name) ?? []),
                    ];
                    if (rewards.length > 0) toast.info(`Nowe nagrody: ${rewards.join(", ")}`);
                },
                onError: (error) => toast.error(error.message),
            },
        );
    }

    return (
        <div data-testid="trade-offer" className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <OfferCard label="Oddajesz" card={given} compact={compact} />
                <ArrowLeftRight aria-hidden="true" className="size-5 shrink-0" />
                <OfferCard label="Otrzymujesz" card={received} compact={compact} />
            </div>

            {isOpen && trade.receivedOverLimit && (
                <p className="rounded-[14px] bg-peach p-3 text-sm font-medium text-foreground">
                    <strong>LIMIT:</strong> masz już {MAX_CARD_COPIES} egzemplarzy karty {received.name}. Po wymianie
                    otrzymany egzemplarz przepadnie.
                </p>
            )}

            {isOpen ? (
                trade.incoming ? (
                    <div className="flex flex-wrap gap-2">
                        <Button disabled={answer.isPending} onClick={() => respond("accept")}>
                            Akceptuj
                        </Button>
                        <Button variant="outline" disabled={answer.isPending} onClick={() => respond("reject")}>
                            Odrzuć
                        </Button>
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        className="self-start"
                        disabled={answer.isPending}
                        onClick={() => respond("cancel")}
                    >
                        Wycofaj ofertę
                    </Button>
                )
            ) : (
                <p className="text-sm font-medium">Ta oferta jest już zamknięta.</p>
            )}
        </div>
    );
}
