"use client";

import {useEffect, useRef, useState} from "react";
import CardFace from "@/components/data-display/CardFace";
import {Button} from "@/components/ui/button";
import CardBadges from "@/features/pack-opening/CardBadges";
import {FLIP_DELAY_MS, revealEffect} from "@/features/pack-opening/flow";
import {motionMs} from "@/lib/motion";
import {cn} from "@/lib/utils";
import type {OpenedCard} from "@/server/services/packs";

const SWIPE_DISTANCE_PX = 70;
const CLICK_SLOP_PX = 8;
const LEAVE_MS = 240;
/** The aura of a rare card reaches past the card, and text has to stay readable on top of it. */
const ABOVE_AURA = "relative z-10 rounded-2xl bg-[#15112b]/80 px-3 py-1";

function CardBack({className}: {className?: string}) {
    return (
        <span aria-hidden="true" className={cn("card-back", className)}>
            <span className="font-display text-sm font-bold text-[#e4deff]">pokimoni</span>
        </span>
    );
}

/** One card on the table. The parent gives each card its own key, so all of this starts over with the next one. */
export default function CardReveal({
    card,
    index,
    total,
    onNext,
}: {
    card: OpenedCard;
    index: number;
    total: number;
    onNext: () => void;
}) {
    const effect = revealEffect(card.rarity);
    const [flipped, setFlipped] = useState(false);
    const [leaving, setLeaving] = useState<"left" | "right" | null>(null);
    const [dragX, setDragX] = useState(0);
    const drag = useRef<{startX: number; moved: boolean} | null>(null);
    const nextButton = useRef<HTMLButtonElement>(null);
    const isLast = index + 1 === total;

    useEffect(() => {
        nextButton.current?.focus();
        const timer = setTimeout(() => setFlipped(true), motionMs(FLIP_DELAY_MS[effect]));
        return () => clearTimeout(timer);
    }, [effect]);

    useEffect(() => {
        if (!leaving) return;
        const timer = setTimeout(onNext, motionMs(LEAVE_MS));
        return () => clearTimeout(timer);
    }, [leaving, onNext]);

    /** The first action on a face-down card turns it over instead of throwing it away unseen. */
    function advance(direction: "left" | "right" = "left") {
        if (!flipped) setFlipped(true);
        else if (!leaving) setLeaving(direction);
    }

    return (
        <div
            className="flex min-h-0 flex-1 flex-col items-center justify-between gap-3 px-4 pb-4 md:pb-6"
            onKeyDown={(event) => {
                if (event.key === "ArrowRight") advance();
            }}
        >
            <p className={cn(ABOVE_AURA, "text-sm font-semibold tabular-nums")}>
                Karta {index + 1} z {total}
            </p>

            <div className="reveal-table">
                <div aria-hidden="true" className="reveal-aura" data-effect={effect} data-flipped={flipped} />
                {Array.from({length: Math.min(total - index - 1, 3)}, (_, layer) => (
                    <CardBack key={layer} className="reveal-deck" />
                ))}
                {flipped && effect === "burst" && <div aria-hidden="true" className="reveal-flash" />}

                <div
                    data-testid="reveal-card"
                    className="reveal-swipe"
                    data-leaving={leaving ?? undefined}
                    style={
                        dragX
                            ? {transform: `translateX(${dragX}px) rotate(${dragX / 24}deg)`, transition: "none"}
                            : undefined
                    }
                    onDragStart={(event) => event.preventDefault()}
                    onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        drag.current = {startX: event.clientX, moved: false};
                    }}
                    onPointerMove={(event) => {
                        if (!drag.current) return;
                        const distance = event.clientX - drag.current.startX;
                        if (Math.abs(distance) > CLICK_SLOP_PX) drag.current.moved = true;
                        if (flipped) setDragX(distance);
                    }}
                    onPointerUp={(event) => {
                        if (!drag.current) return;
                        const distance = event.clientX - drag.current.startX;
                        const {moved} = drag.current;
                        drag.current = null;
                        setDragX(0);
                        if (!moved) advance();
                        else if (flipped && Math.abs(distance) >= SWIPE_DISTANCE_PX) {
                            advance(distance < 0 ? "left" : "right");
                        }
                    }}
                    onPointerCancel={() => {
                        drag.current = null;
                        setDragX(0);
                    }}
                >
                    <div className="reveal-flip" data-flipped={flipped}>
                        <CardBack className="reveal-side" />
                        <div className={cn("reveal-side reveal-front", effect === "burst" && "holo-rim p-1")}>
                            <CardFace
                                name={card.name}
                                imageSmall={card.imageSmall}
                                imageLarge={card.imageLarge}
                                className="size-full rounded-[inherit]"
                            />
                            {flipped && (effect === "shine" || effect === "burst") && (
                                <span aria-hidden="true" className="reveal-shine" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={cn(
                    ABOVE_AURA,
                    "flex min-h-14 flex-col items-center gap-1 text-center transition-opacity duration-200",
                    flipped ? "opacity-100" : "opacity-0",
                )}
            >
                <p className="flex flex-wrap items-center justify-center gap-2 font-display text-base font-bold md:text-lg">
                    {card.name}
                    <CardBadges isNew={card.isNew} overLimit={card.overLimit} className="font-sans" />
                </p>
                <p className="text-sm text-muted-foreground">
                    <span className="capitalize">{card.rarity}</span>, +{card.income}/h
                </p>
            </div>

            <Button ref={nextButton} size="lg" className="relative z-10 w-full max-w-xs" onClick={() => advance()}>
                {isLast ? "Zobacz wszystkie" : "Następna karta"}
            </Button>
        </div>
    );
}
