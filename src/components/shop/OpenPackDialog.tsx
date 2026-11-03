"use client";

import Image from "next/image";
import {CoinsIcon} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogTitle} from "@/components/ui/dialog";
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
export default function OpenPackDialog({pack, onClose}: {pack: PackToOpen | null; onClose: () => void}) {
    const open = useOpenPack();
    const result = open.data;

    function handleOpen() {
        if (!pack) return;
        open.mutate(
            {setId: pack.setId, source: pack.source},
            {
                onSuccess: announceRewards,
                onError: (error) => toast.error(error.message),
            },
        );
    }

    function handleClose() {
        open.reset();
        onClose();
    }

    return (
        <Dialog open={pack !== null} onOpenChange={(isOpen) => !isOpen && handleClose()}>
            <DialogContent className="sm:max-w-3xl w-full max-h-[90svh] overflow-y-auto">
                <DialogTitle>{result ? result.set.name : "Otwórz paczkę"}</DialogTitle>

                {!result && pack && (
                    <div className="flex flex-col items-center gap-6 py-6">
                        <Image src={pack.logo} alt={pack.name} width={320} height={160} unoptimized />
                        <Button onClick={handleOpen} disabled={open.isPending}>
                            {open.isPending ? (
                                "Otwieranie..."
                            ) : pack.source === "voucher" ? (
                                "Otwórz za darmo"
                            ) : (
                                <>
                                    Otwórz za {pack.price} <CoinsIcon />
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {result && (
                    <div className="flex flex-col items-center gap-6">
                        {result.isGodPack && <p className="text-xl font-bold text-yellow-600">God pack!</p>}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 w-full">
                            {result.cards.map((card, index) => (
                                <div key={`${card.id}-${index}`} className="relative" data-testid="opened-card">
                                    <Image
                                        src={card.imageSmall}
                                        alt={card.name}
                                        width={245}
                                        height={342}
                                        unoptimized
                                        className="w-full h-auto"
                                    />
                                    {card.isNew && (
                                        <span className="absolute top-1 left-1 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded">
                                            NOWA
                                        </span>
                                    )}
                                    {card.overLimit && (
                                        <span className="absolute top-1 left-1 bg-gray-700 text-white text-xs font-semibold px-2 py-0.5 rounded">
                                            LIMIT
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <Button onClick={handleClose}>Zamknij</Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
