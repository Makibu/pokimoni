"use client";

import {useEffect, useRef} from "react";
import {Coins} from "lucide-react";
import {Button} from "@/components/ui/button";
import {LoadedImage} from "@/components/ui/loaded-image";
import {MAX_CARD_COPIES} from "@/domain/economy";
import CardBadges from "@/features/pack-opening/CardBadges";
import {type PackToOpen, revealEffect} from "@/features/pack-opening/flow";
import {cn} from "@/lib/utils";
import type {OpenedCard} from "@/server/services/packs";

const RIM_BY_EFFECT = {
    none: "bg-transparent",
    glow: "bg-[#7fb5ff]",
    shine: "bg-[#ffd36b]",
    burst: "holo-rim",
};

export default function PackSummary({
    pack,
    cards,
    isGodPack,
    canOpenAnother,
    opening,
    onPreview,
    onOpenAnother,
    onClose,
}: {
    pack: PackToOpen;
    cards: OpenedCard[];
    isGodPack: boolean;
    canOpenAnother: boolean;
    opening: boolean;
    onPreview: (card: OpenedCard) => void;
    onOpenAnother: () => void;
    onClose: () => void;
}) {
    const primary = useRef<HTMLButtonElement>(null);
    const hasOverLimit = cards.some((card) => card.overLimit);

    useEffect(() => {
        primary.current?.focus();
    }, []);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-4 pt-1 pb-4">
                <div className="my-auto flex w-full flex-col items-center gap-4">
                    <h2 className="font-display text-xl font-bold md:text-2xl">
                        {isGodPack ? "God pack!" : "Twoje karty"}
                    </h2>
                    <ul className="flex w-full max-w-5xl flex-wrap justify-center gap-3 md:gap-4 2xl:max-w-7xl">
                        {cards.map((card, index) => (
                            <li
                                key={`${card.id}-${index}`}
                                className="w-[calc(50%-0.375rem)] sm:w-[calc(33.333%-0.5rem)] lg:w-[calc(20%-0.8rem)]"
                            >
                                <button
                                    type="button"
                                    data-testid="opened-card"
                                    aria-label={`Podgląd karty ${card.name}`}
                                    onClick={() => onPreview(card)}
                                    className="flex w-full flex-col gap-2 rounded-[16px] text-left transition-transform motion-safe:hover:-translate-y-1"
                                >
                                    <span
                                        className={cn(
                                            "relative block rounded-[16px] p-[3px]",
                                            RIM_BY_EFFECT[revealEffect(card.rarity)],
                                        )}
                                    >
                                        <LoadedImage
                                            src={card.imageSmall}
                                            alt={card.name}
                                            width={245}
                                            height={342}
                                            eager
                                            className="aspect-[245/342] rounded-[13px]"
                                        />
                                        <CardBadges
                                            isNew={card.isNew}
                                            overLimit={card.overLimit}
                                            className="absolute bottom-2 left-2"
                                        />
                                    </span>
                                    <span className="min-w-0 px-0.5">
                                        <span className="block truncate text-sm font-bold">{card.name}</span>
                                        <span className="block truncate text-xs text-muted-foreground capitalize">
                                            {card.rarity}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    {hasOverLimit && (
                        <p className="max-w-prose text-center text-sm text-muted-foreground">
                            LIMIT: masz już {MAX_CARD_COPIES} egzemplarzy tej karty, więc ten nie trafił do kolekcji.
                        </p>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-center gap-2 border-t bg-background p-3 md:p-4">
                {!canOpenAnother && (
                    <p className="text-sm text-muted-foreground">
                        {pack.source === "voucher"
                            ? "To była ostatnia darmowa paczka."
                            : "Brakuje monet na kolejną paczkę."}
                    </p>
                )}
                <div className="flex w-full max-w-md flex-col-reverse justify-center gap-2 sm:flex-row">
                    <Button ref={canOpenAnother ? undefined : primary} variant="outline" size="lg" onClick={onClose}>
                        Zamknij
                    </Button>
                    {canOpenAnother && (
                        <Button ref={primary} size="lg" disabled={opening} onClick={onOpenAnother}>
                            {opening ? (
                                "Otwieranie..."
                            ) : pack.source === "voucher" ? (
                                "Otwórz kolejną za darmo"
                            ) : (
                                <>
                                    Otwórz kolejną za {pack.price} <Coins aria-hidden="true" />
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
