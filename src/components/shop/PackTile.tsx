"use client";

import {Coins, Gift} from "lucide-react";
import {Button} from "@/components/ui/button";
import {LoadedImage} from "@/components/ui/loaded-image";
import {ProgressBar} from "@/components/ui/progress-bar";
import type {PackSource, ShopSet} from "@/server/services/packs";

type PackTileProps = {
    set: ShopSet;
    coins: number;
    vouchers: number;
    onOpen: (set: ShopSet, source: PackSource) => void;
};

export default function PackTile({set, coins, vouchers, onOpen}: PackTileProps) {
    return (
        <li className="w-44 shrink-0 snap-start sm:w-52 lg:w-auto">
            <div className="holo-rim h-full rounded-tile p-1">
                <div className="flex h-full flex-col gap-3 rounded-[18px] bg-card p-3">
                    <div className="rounded-md bg-white p-2">
                        <LoadedImage
                            src={set.logo}
                            alt=""
                            width={180}
                            height={90}
                            fit="contain"
                            className="h-16 w-full rounded-sm"
                        />
                    </div>
                    <h3 className="line-clamp-2 min-h-10 text-sm leading-5 font-bold">{set.name}</h3>
                    <div className="flex flex-col gap-1">
                        <p className="text-xs font-medium text-muted-foreground tabular-nums">
                            Zebrane: {set.collected} z {set.total}
                        </p>
                        <ProgressBar value={set.collected} max={set.total} />
                    </div>
                    <div className="mt-auto flex gap-2">
                        <Button
                            size="sm"
                            className="flex-1"
                            aria-label={`Kup paczkę ${set.name} za ${set.price} monet`}
                            disabled={coins < set.price}
                            onClick={() => onOpen(set, "shop")}
                        >
                            {set.price}
                            <Coins aria-hidden="true" />
                        </Button>
                        {vouchers > 0 && (
                            <Button
                                size="icon"
                                variant="secondary"
                                aria-label={`Otwórz za darmo: ${set.name}`}
                                title="Otwórz za darmo"
                                onClick={() => onOpen(set, "voucher")}
                            >
                                <Gift aria-hidden="true" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </li>
    );
}
