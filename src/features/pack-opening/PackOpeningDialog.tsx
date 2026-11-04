"use client";

import {Coins, XIcon} from "lucide-react";
import {useCallback, useEffect, useReducer, useRef, useState} from "react";
import {toast} from "sonner";
import CardPreview, {type PreviewedCard} from "@/components/data-display/CardPreview";
import {Button} from "@/components/ui/button";
import {Dialog, DialogClose, DialogContent, DialogTitle} from "@/components/ui/dialog";
import type {PackTier} from "@/domain/economy";
import {type OpenedPack, useOpenPack, usePlayer, useShop} from "@/features/game/use-game";
import CardReveal from "@/features/pack-opening/CardReveal";
import {canOpenAgain, type FlowEvent, nextStage, type PackToOpen, type Stage} from "@/features/pack-opening/flow";
import PackStage from "@/features/pack-opening/PackStage";
import PackSummary from "@/features/pack-opening/PackSummary";
import "@/features/pack-opening/pack-opening.css";
import {motionMs} from "@/lib/motion";

const TEAR_MS = 650;

function announceRewards({earned}: OpenedPack) {
    if (earned.achievements.length > 0) {
        toast.info(`Nowe osiągnięcia: ${earned.achievements.map((achievement) => achievement.title).join(", ")}`);
    }
    if (earned.badges.length > 0) {
        toast.info(`Nowe odznaki: ${earned.badges.map((badge) => badge.name).join(", ")}`);
    }
}

export default function PackOpeningDialog({pack, onClose}: {pack: PackToOpen; onClose: () => void}) {
    const open = useOpenPack();
    const {data: player} = usePlayer();
    const {data: shop} = useShop();
    const [opened, setOpened] = useState<OpenedPack | null>(null);
    const [preview, setPreview] = useState<PreviewedCard | null>(null);
    const cardCount = opened?.cards.length ?? 0;
    const [stage, dispatch] = useReducer((current: Stage, event: FlowEvent) => nextStage(current, event, cardCount), {
        name: "offer",
    });
    const packButton = useRef<HTMLButtonElement>(null);
    // Rewards wait for the end of the ritual, or a toast would give away the cards before they are shown.
    const unannounced = useRef<OpenedPack | null>(null);

    const flushRewards = useCallback(() => {
        if (unannounced.current) announceRewards(unannounced.current);
        unannounced.current = null;
    }, []);

    useEffect(() => {
        if (stage.name === "summary") flushRewards();
        if (stage.name === "sealed") packButton.current?.focus();
        if (stage.name !== "torn") return;
        const timer = setTimeout(() => dispatch("opened"), motionMs(TEAR_MS));
        return () => clearTimeout(timer);
    }, [stage.name, flushRewards]);

    function buy() {
        open.mutate(
            {setId: pack.setId, source: pack.source},
            {
                onSuccess: (result) => {
                    for (const card of result.cards) new Image().src = card.imageSmall;
                    unannounced.current = result;
                    setOpened(result);
                    dispatch("bought");
                },
                onError: (error) => toast.error(error.message),
            },
        );
    }

    function close() {
        flushRewards();
        onClose();
    }

    const showNext = useCallback(() => dispatch("next"), []);
    const canSkip = stage.name === "sealed" || stage.name === "torn" || stage.name === "reveal";
    const tier = shop?.sets.find((set) => set.id === pack.setId)?.tier as PackTier | undefined;
    const vouchers = shop && tier ? shop.vouchers[tier] : 0;

    return (
        <Dialog open onOpenChange={(isOpen) => !isOpen && !open.isPending && close()}>
            {/* The `dark` class gives this window the dark tokens in both themes: the effects need a dark table. */}
            <DialogContent
                showCloseButton={false}
                aria-describedby={undefined}
                className="dark pack-table top-0 left-0 flex h-svh max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden bg-background p-0 text-foreground"
            >
                <header className="relative z-10 flex items-center justify-between gap-2 p-3 md:p-4">
                    <DialogTitle className="min-w-0 truncate pl-1 text-sm md:text-base">{pack.name}</DialogTitle>
                    <div className="flex shrink-0 items-center gap-1">
                        {canSkip && (
                            <Button variant="ghost" onClick={() => dispatch("skip")}>
                                Pomiń
                            </Button>
                        )}
                        <DialogClose
                            disabled={open.isPending}
                            className="flex size-11 items-center justify-center rounded-full transition-colors hover:bg-accent disabled:opacity-60"
                        >
                            <XIcon aria-hidden="true" className="size-5" />
                            <span className="sr-only">Zamknij</span>
                        </DialogClose>
                    </div>
                </header>

                {(stage.name === "offer" || stage.name === "sealed" || stage.name === "torn") && (
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 pb-8">
                        <PackStage
                            pack={pack}
                            state={stage.name}
                            onCut={() => dispatch("cut")}
                            buttonRef={packButton}
                        />
                        <div className="flex min-h-12 items-center justify-center">
                            {stage.name === "offer" && (
                                <Button size="lg" onClick={buy} disabled={open.isPending}>
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
                            )}
                            {stage.name === "sealed" && (
                                <p className="text-center text-sm font-semibold">
                                    Przeciągnij palcem lub myszą po paczce albo ją kliknij
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {stage.name === "reveal" && opened && (
                    <>
                        <p aria-live="polite" className="sr-only">
                            Karta {stage.index + 1} z {cardCount}: {opened.cards[stage.index].name},{" "}
                            {opened.cards[stage.index].rarity}
                            {opened.cards[stage.index].isNew ? ", nowa" : ""}
                            {opened.cards[stage.index].overLimit ? ", limit egzemplarzy" : ""}
                        </p>
                        <CardReveal
                            key={stage.index}
                            card={opened.cards[stage.index]}
                            index={stage.index}
                            total={cardCount}
                            onNext={showNext}
                        />
                    </>
                )}

                {stage.name === "summary" && opened && (
                    <PackSummary
                        pack={pack}
                        cards={opened.cards}
                        isGodPack={opened.isGodPack}
                        canOpenAnother={canOpenAgain(pack, player?.coins ?? 0, vouchers)}
                        opening={open.isPending}
                        onPreview={(card) => setPreview({...card, copies: card.ownedCopies})}
                        onOpenAnother={buy}
                        onClose={close}
                    />
                )}

                {preview && opened && (
                    <CardPreview card={preview} setName={opened.set.name} onClose={() => setPreview(null)} />
                )}
            </DialogContent>
        </Dialog>
    );
}
