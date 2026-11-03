"use client";

import Image from "next/image";
import {useState} from "react";
import {CoinsIcon, Package} from "lucide-react";
import {toast} from "sonner";
import CardTile from "@/components/data-display/CardTile";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Drawer, DrawerContent, DrawerHeader, DrawerTitle} from "@/components/ui/drawer";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import {useCollectPiggyBank, useOwnedCards, usePlayer, useSetSlot} from "@/features/game/use-game";
import type {CollectionCard} from "@/server/services/collection";
import type {SlotNumber} from "@/server/services/wallet";

const SLOTS: SlotNumber[] = [1, 2];

function PiggyBank() {
    const {data: player} = usePlayer();
    const collect = useCollectPiggyBank();
    if (!player) return null;
    const {balance, capacity} = player.piggyBank;

    return (
        <div className="flex items-center justify-between gap-3 bg-white/80 backdrop-blur-md rounded-xl border border-blue-200 shadow-sm px-4 py-2 w-full">
            <div className="text-sm">
                <div className="font-semibold flex items-center gap-1">
                    <CoinsIcon className="h-4 w-4 text-yellow-500" />
                    Skarbonka: {balance}/{capacity}
                </div>
                {balance >= capacity && <div className="text-xs text-red-500">Pełna: karty przestały zarabiać</div>}
            </div>
            <Button
                size="sm"
                disabled={balance === 0 || collect.isPending}
                onClick={() =>
                    collect.mutate(undefined, {
                        onSuccess: ({collected}) => toast.success(`Odebrano ${collected} monet`),
                        onError: (error) => toast.error(error.message),
                    })
                }
            >
                Odbierz
            </Button>
        </div>
    );
}

export default function IncomeSlots() {
    const {data: player, isLoading: playerLoading} = usePlayer();
    const {data: ownedCards, isLoading: cardsLoading} = useOwnedCards();
    const setSlot = useSetSlot();
    const [openSlot, setOpenSlot] = useState<SlotNumber | null>(null);

    const slottedIds: Record<SlotNumber, string | null> = {
        1: player?.slots.slot1CardId ?? null,
        2: player?.slots.slot2CardId ?? null,
    };

    function cardInSlot(slot: SlotNumber) {
        return ownedCards?.find((card) => card.id === slottedIds[slot]) ?? null;
    }

    /** A card can go into a slot if a copy remains after the other slot took one. */
    function selectableCards(slot: SlotNumber): CollectionCard[] {
        const otherSlot = slot === 1 ? 2 : 1;
        return (ownedCards ?? []).filter((card) => card.quantity > (slottedIds[otherSlot] === card.id ? 1 : 0));
    }

    function handleSelect(slot: SlotNumber, card: CollectionCard) {
        setOpenSlot(null);
        setSlot.mutate(
            {slot, cardId: slottedIds[slot] === card.id ? null : card.id},
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
        <div className="xl:absolute xl:top-1/2 xl:right-6 flex flex-col gap-3 xl:-translate-y-1/2 z-10 mt-12 xl:mt-0 scale-90 xl:scale-100 items-center">
            <div className="flex gap-2">
                {SLOTS.map((slot) => {
                    const selected = cardInSlot(slot);
                    return (
                        <div key={slot} className="flex flex-col items-center">
                            {playerLoading || cardsLoading ? (
                                <Card className="w-[150px] md:w-[200px] aspect-[245/342] bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-dashed border-gray-300 group">
                                    <CardContent className="flex flex-col items-center justify-center h-full p-1">
                                        <div className={"w-32 h-32"}>
                                            <LoadingIndicator />
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : selected ? (
                                <button
                                    className={
                                        "w-[150px] md:w-[170px] lg:w-[200px] rounded-md cursor-pointer flex items-center justify-center hover:shadow-md hover:scale-105 transition-all duration-300"
                                    }
                                    style={{aspectRatio: "300/418"}}
                                    aria-label={`Slot ${slot}: ${selected.name}`}
                                    onClick={() => setOpenSlot(slot)}
                                >
                                    <Image
                                        src={selected.imageSmall}
                                        alt={selected.name}
                                        width={245}
                                        height={342}
                                        unoptimized
                                        className="w-full h-full object-cover rounded"
                                    />
                                </button>
                            ) : (
                                <button aria-label={`Slot na kartę ${slot}`} onClick={() => setOpenSlot(slot)}>
                                    <Card className="w-[150px] md:w-[200px] aspect-[245/342] bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 transition-all duration-300 hover:scale-[1.03] cursor-pointer group">
                                        <CardContent className="flex flex-col items-center justify-center h-full p-1">
                                            <div className="w-12 h-12 rounded-full bg-gray-300 group-hover:bg-blue-300 flex items-center justify-center mb-4 transition-colors duration-300">
                                                <Package className="h-8 w-8 text-gray-500 group-hover:text-blue-600 transition-colors duration-300" />
                                            </div>
                                            <p className="text-gray-500 group-hover:text-blue-600 font-medium text-center transition-colors duration-300">
                                                Slot na kartę #{slot}
                                            </p>
                                            <p className="text-xs text-gray-400 group-hover:text-blue-500 mt-2 text-center transition-colors duration-300">
                                                Kliknij aby dodać
                                            </p>
                                        </CardContent>
                                    </Card>
                                </button>
                            )}

                            <Drawer open={openSlot === slot} onOpenChange={(open) => !open && setOpenSlot(null)}>
                                <DrawerContent className="h-[85vh]">
                                    <DrawerHeader>
                                        <DrawerTitle>{`Wybierz kartę do slotu ${slot}`}</DrawerTitle>
                                    </DrawerHeader>
                                    {cardsLoading ? (
                                        <LoadingIndicator />
                                    ) : selectableCards(slot).length === 0 ? (
                                        <p className="text-center text-gray-500 px-8 pt-5">
                                            Nie masz jeszcze żadnych kart. Otwórz paczkę w sklepie!
                                        </p>
                                    ) : (
                                        <div className="px-8 pt-5 overflow-y-scroll">
                                            <div className="grid grid-cols-3 md:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 max-w-full">
                                                {selectableCards(slot).map((card) => (
                                                    <button
                                                        key={card.id}
                                                        onClick={() => handleSelect(slot, card)}
                                                        className="cursor-pointer hover:scale-[1.03] transition-all text-left"
                                                    >
                                                        <CardTile {...card} visibleNames />
                                                    </button>
                                                ))}
                                            </div>
                                            <div className={"w-full h-12"}></div>
                                        </div>
                                    )}
                                </DrawerContent>
                            </Drawer>
                        </div>
                    );
                })}
            </div>
            <PiggyBank />
        </div>
    );
}
