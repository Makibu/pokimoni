"use client";

import {Plus} from "lucide-react";
import dynamic from "next/dynamic";
import {useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {LoadedImage} from "@/components/ui/loaded-image";
import {ProgressBar} from "@/components/ui/progress-bar";
import {LoadingRegion, Skeleton} from "@/components/ui/skeleton";
import {ErrorState} from "@/components/ui/states";
import {useCollectPiggyBank, useOwnedCards, usePlayer, useSetSlot} from "@/features/game/use-game";
import {coinsAccusative} from "@/lib/format";
import {cn} from "@/lib/utils";
import type {CollectionCard} from "@/server/services/collection";
import type {SlotNumber} from "@/server/services/wallet";

const SlotPicker = dynamic(() => import("@/components/home/SlotPicker"));

const SLOTS: SlotNumber[] = [1, 2];
const SLOT_TILT: Record<SlotNumber, string> = {1: "-rotate-3", 2: "rotate-2"};
const SLOT_SIZE = "aspect-[245/342] w-full max-w-[228px]";

function Stage({children}: {children: React.ReactNode}) {
    return (
        <section className="relative flex min-w-0 flex-col gap-5 overflow-hidden rounded-stage bg-lilac px-4 py-5 md:gap-6 md:px-8 md:py-7">
            <div
                aria-hidden="true"
                className="absolute -top-20 -right-16 size-56 rounded-full bg-pink md:-top-28 md:-right-20 md:size-90"
            />
            <div
                aria-hidden="true"
                className="absolute -bottom-20 -left-14 size-44 rounded-full bg-aqua md:-bottom-24 md:-left-16 md:size-72"
            />
            {children}
        </section>
    );
}

export function IncomeStageSkeleton() {
    return (
        <Stage>
            <LoadingRegion className="relative flex flex-col gap-5 md:gap-6">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-7 w-4/5 rounded-full md:h-9" />
                    <Skeleton className="h-7 w-1/2 rounded-full md:h-9" />
                </div>
                <div className="grid grid-cols-2 justify-items-center gap-4 py-1 md:gap-7">
                    {SLOTS.map((slot) => (
                        <Skeleton key={slot} className={cn(SLOT_SIZE, "rounded-[20px]", SLOT_TILT[slot])} />
                    ))}
                </div>
                <Skeleton className="h-16 rounded-[22px]" />
            </LoadingRegion>
        </Stage>
    );
}

function PiggyBank({balance, capacity}: {balance: number; capacity: number}) {
    const collect = useCollectPiggyBank();

    return (
        <div className="relative flex items-center gap-3 rounded-[22px] bg-card py-2.5 pr-2.5 pl-4 md:gap-4 md:pl-5">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <p className="text-sm font-semibold tabular-nums md:text-[15px]">
                    Skarbonka:{" "}
                    <span className="whitespace-nowrap">
                        {balance} z {capacity} monet
                    </span>
                </p>
                <ProgressBar value={balance} max={capacity} />
                {balance >= capacity && (
                    <p className="text-xs font-semibold text-destructive">Pełna: karty przestały zarabiać</p>
                )}
            </div>
            <Button
                disabled={balance === 0 || collect.isPending}
                onClick={() =>
                    collect.mutate(undefined, {
                        onSuccess: ({collected}) => toast.success(`Odebrano ${coinsAccusative(collected)}`),
                        onError: (error) => toast.error(error.message),
                    })
                }
            >
                Odbierz
            </Button>
        </div>
    );
}

export default function IncomeStage() {
    const player = usePlayer();
    const owned = useOwnedCards();
    const setSlot = useSetSlot();
    const [openSlot, setOpenSlot] = useState<SlotNumber | null>(null);

    if (!player.data || !owned.data) {
        const error = player.error ?? owned.error;
        if (!error) return <IncomeStageSkeleton />;
        return (
            <ErrorState
                message={error.message}
                onRetry={() => {
                    void player.refetch();
                    void owned.refetch();
                }}
            />
        );
    }

    const ownedCards = owned.data;
    const slottedIds: Record<SlotNumber, string | null> = {
        1: player.data.slots.slot1CardId,
        2: player.data.slots.slot2CardId,
    };
    const {balance, capacity, incomePerHour} = player.data.piggyBank;

    /** A card can go into a slot if a copy remains after the other slot took one. */
    function selectableCards(slot: SlotNumber): CollectionCard[] {
        const otherSlot = slot === 1 ? 2 : 1;
        return ownedCards.filter((card) => card.quantity > (slottedIds[otherSlot] === card.id ? 1 : 0));
    }

    function placeCard(slot: SlotNumber, cardId: string | null) {
        setOpenSlot(null);
        setSlot.mutate(
            {slot, cardId},
            {
                onSuccess: ({earned}) => {
                    if (earned.badges.length > 0) {
                        toast.info(`Nowe odznaki: ${earned.badges.map((badge) => badge.name).join(", ")}`);
                    }
                },
                onError: (error) => toast.error(error.message),
            },
        );
    }

    return (
        <Stage>
            <h1 className="font-display relative text-xl leading-tight font-bold text-balance md:text-3xl">
                {incomePerHour > 0
                    ? `Twoje karty zarabiają ${coinsAccusative(incomePerHour)} na godzinę`
                    : "Dodaj karty do slotów, a zaczną zarabiać monety"}
            </h1>

            <div className="relative grid grid-cols-2 justify-items-center gap-4 py-1 md:gap-7">
                {SLOTS.map((slot) => {
                    const card = ownedCards.find((owned) => owned.id === slottedIds[slot]);
                    if (card) {
                        return (
                            <button
                                key={slot}
                                aria-label={`Slot ${slot}: ${card.name}, ${incomeLabel(card.income)}`}
                                onClick={() => setOpenSlot(slot)}
                                className={cn(
                                    "holo-rim relative rounded-[20px] p-[5px] transition-transform motion-safe:hover:scale-[1.02] motion-safe:hover:rotate-0",
                                    SLOT_SIZE,
                                    SLOT_TILT[slot],
                                )}
                            >
                                <LoadedImage
                                    key={card.imageSmall}
                                    src={card.imageSmall}
                                    alt={card.name}
                                    width={245}
                                    height={342}
                                    eager
                                    className="size-full rounded-[15px]"
                                />
                                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-card px-3 py-1 text-xs font-bold text-foreground">
                                    +{card.income}/h
                                </span>
                            </button>
                        );
                    }
                    return (
                        <button
                            key={slot}
                            aria-label={`Slot na kartę ${slot}: dodaj kartę`}
                            onClick={() => setOpenSlot(slot)}
                            className={cn(
                                "flex flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-primary bg-card/60 px-2 text-sm font-bold text-accent-ink transition-colors hover:bg-card",
                                SLOT_SIZE,
                                SLOT_TILT[slot],
                            )}
                        >
                            <Plus aria-hidden="true" className="size-8" />
                            Dodaj kartę
                        </button>
                    );
                })}
            </div>

            <PiggyBank balance={balance} capacity={capacity} />

            {openSlot && (
                <SlotPicker
                    slot={openSlot}
                    cards={selectableCards(openSlot)}
                    selectedId={slottedIds[openSlot]}
                    onPlace={(cardId) => placeCard(openSlot, cardId)}
                    onClose={() => setOpenSlot(null)}
                />
            )}
        </Stage>
    );
}

function incomeLabel(income: number): string {
    return `${coinsAccusative(income)} na godzinę`;
}
