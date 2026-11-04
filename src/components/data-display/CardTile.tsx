"use client";

import {LoadedImage} from "@/components/ui/loaded-image";

type CardTileProps = {
    name: string;
    rarity: string;
    imageSmall: string;
    income: number;
    quantity: number;
    visibleNames?: boolean;
};

export default function CardTile({name, rarity, imageSmall, income, quantity, visibleNames}: CardTileProps) {
    const isOwned = quantity > 0;
    const showName = isOwned || visibleNames;

    return (
        // Sets have hundreds of cards: the browser skips drawing the ones outside the screen.
        <div className="flex flex-col gap-2 [contain-intrinsic-size:auto_300px] [content-visibility:auto]">
            <div className="relative">
                {isOwned ? (
                    <LoadedImage
                        src={imageSmall}
                        alt={name}
                        width={245}
                        height={342}
                        className="aspect-[245/342] rounded-[14px]"
                    />
                ) : (
                    <div className="flex aspect-[245/342] items-center justify-center rounded-[14px] border-2 border-dashed border-input bg-secondary p-2 text-center">
                        <span aria-hidden="true" className="font-display text-3xl font-bold text-muted-foreground">
                            ?
                        </span>
                    </div>
                )}
                <span className="absolute top-1.5 right-1.5 rounded-full bg-card px-2 py-0.5 text-xs font-bold text-foreground">
                    +{income}/h
                </span>
                {quantity > 1 && (
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                        ×{quantity}
                    </span>
                )}
            </div>
            <div className="min-w-0 px-0.5">
                <p className="truncate text-sm font-bold" title={showName ? name : undefined}>
                    {showName ? name : "???"}
                </p>
                <p className="truncate text-xs text-muted-foreground capitalize">{rarity}</p>
            </div>
        </div>
    );
}
