"use client";

import {Coins} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {LoadedImage} from "@/components/ui/loaded-image";
import {type OpenedPack, useOpenPack} from "@/features/game/use-game";
import type {PackSource} from "@/server/services/packs";

export type PackToOpen = {
    setId: string;
    name: string;
    logo: string;
    price: number;
    source: PackSource;
};

function announceRewards({earned}: OpenedPack) {
    if (earned.achievements.length > 0) {
        toast.info(`Nowe osiągnięcia: ${earned.achievements.map((achievement) => achievement.title).join(", ")}`);
    }
    if (earned.badges.length > 0) {
        toast.info(`Nowe odznaki: ${earned.badges.map((badge) => badge.name).join(", ")}`);
    }
}

/** Simple pack opening; the full reveal experience replaces it in phase 5 of the rebuild plan. */
export default function OpenPackDialog({pack, onClose}: {pack: PackToOpen; onClose: () => void}) {
    const open = useOpenPack();
    const result = open.data;

    function handleOpen() {
        open.mutate(
            {setId: pack.setId, source: pack.source},
            {
                onSuccess: announceRewards,
                onError: (error) => toast.error(error.message),
            },
        );
    }

    return (
        <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent
                className={result ? "max-w-[calc(100%-2rem)] sm:max-w-3xl" : undefined}
                aria-describedby={undefined}
            >
                <DialogHeader>
                    <DialogTitle>{result ? result.set.name : "Otwórz paczkę"}</DialogTitle>
                </DialogHeader>

                {!result && (
                    <div className="flex flex-col items-center gap-6 py-2">
                        <div className="holo-rim w-full max-w-64 rotate-[-2deg] rounded-[22px] p-[5px]">
                            <div className="rounded-[17px] bg-white p-5">
                                <LoadedImage
                                    src={pack.logo}
                                    alt={pack.name}
                                    width={320}
                                    height={160}
                                    fit="contain"
                                    eager
                                    className="h-28 w-full rounded-sm"
                                />
                            </div>
                        </div>
                        <Button size="lg" onClick={handleOpen} disabled={open.isPending}>
                            {open.isPending ? (
                                "Otwieranie..."
                            ) : pack.source === "voucher" ? (
                                "Otwórz za darmo"
                            ) : (
                                <>
                                    Otwórz za {pack.price} <Coins aria-hidden="true" />
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {result && (
                    <div className="flex flex-col items-center gap-5">
                        {result.isGodPack && (
                            <p className="font-display text-xl font-bold text-accent-ink">God pack!</p>
                        )}
                        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                            {result.cards.map((card, index) => (
                                <div key={`${card.id}-${index}`} className="relative" data-testid="opened-card">
                                    <LoadedImage
                                        src={card.imageSmall}
                                        alt={card.name}
                                        width={245}
                                        height={342}
                                        eager
                                        className="aspect-[245/342] rounded-[12px]"
                                    />
                                    {card.isNew && (
                                        <span className="absolute top-1.5 left-1.5 rounded-full bg-[#0b6b4a] px-2 py-0.5 text-xs font-bold text-white">
                                            NOWA
                                        </span>
                                    )}
                                    {card.overLimit && (
                                        <span className="absolute top-1.5 left-1.5 rounded-full bg-[#221b4b] px-2 py-0.5 text-xs font-bold text-white">
                                            LIMIT
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <Button onClick={onClose}>Zamknij</Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
