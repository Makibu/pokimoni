"use client";

import dynamic from "next/dynamic";
import {useState} from "react";
import {LoadedImage} from "@/components/ui/loaded-image";

const CardPreview = dynamic(() => import("@/components/data-display/CardPreview"), {ssr: false});

type CardTileProps = {
    name: string;
    rarity: string;
    imageSmall: string;
    imageLarge: string;
    income: number;
    quantity: number;
    /** Copies held in the player's open trade offers. */
    escrowed?: number;
    /** Without it the tile is only a picture, for places where the whole tile is already a control. */
    setName?: string;
    visibleNames?: boolean;
};

export default function CardTile({
    name,
    rarity,
    imageSmall,
    imageLarge,
    income,
    quantity,
    escrowed = 0,
    setName,
    visibleNames,
}: CardTileProps) {
    const [previewing, setPreviewing] = useState(false);
    const isOwned = quantity > 0;
    const showName = isOwned || visibleNames;
    const picture = (
        <LoadedImage src={imageSmall} alt={name} width={245} height={342} className="aspect-[245/342] rounded-[14px]" />
    );

    return (
        // Sets have hundreds of cards: the browser skips drawing the ones outside the screen.
        <div className="flex flex-col gap-2 [contain-intrinsic-size:auto_300px] [content-visibility:auto]">
            <div className="relative">
                {isOwned && setName ? (
                    <button
                        type="button"
                        aria-label={`Podgląd karty ${name}`}
                        onClick={() => setPreviewing(true)}
                        className="block w-full rounded-[14px] transition-transform motion-safe:hover:-translate-y-0.5"
                    >
                        {picture}
                    </button>
                ) : isOwned ? (
                    picture
                ) : (
                    <div className="flex aspect-[245/342] items-center justify-center rounded-[14px] border-2 border-dashed border-input bg-secondary p-2 text-center">
                        <span aria-hidden="true" className="font-display text-3xl font-bold text-muted-foreground">
                            ?
                        </span>
                    </div>
                )}
                <span className="pointer-events-none absolute top-1.5 right-1.5 rounded-full bg-card px-2 py-0.5 text-xs font-bold text-foreground">
                    +{income}/h
                </span>
                {quantity > 1 && (
                    <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                        ×{quantity}
                    </span>
                )}
                {escrowed > 0 && (
                    <span className="pointer-events-none absolute right-1.5 bottom-1.5 rounded-full bg-sun px-2 py-0.5 text-xs font-bold text-foreground">
                        W ofercie
                    </span>
                )}
            </div>
            <div className="min-w-0 px-0.5">
                <p className="truncate text-sm font-bold" title={showName ? name : undefined}>
                    {showName ? name : "???"}
                </p>
                <p className="truncate text-xs text-muted-foreground capitalize">{rarity}</p>
            </div>
            {previewing && setName && (
                <CardPreview
                    card={{name, rarity, income, imageSmall, imageLarge, copies: quantity, escrowed}}
                    setName={setName}
                    onClose={() => setPreviewing(false)}
                />
            )}
        </div>
    );
}
