"use client";

import Link from "next/link";
import {useMemo} from "react";
import CardTile from "@/components/data-display/CardTile";
import {Button, buttonVariants} from "@/components/ui/button";
import {Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle} from "@/components/ui/drawer";
import {EmptyState} from "@/components/ui/states";
import {cn} from "@/lib/utils";
import type {CollectionCard} from "@/server/services/collection";

type SlotPickerProps = {
    slot: number;
    cards: CollectionCard[];
    selectedId: string | null;
    /** `null` takes the card out of the slot. */
    onPlace: (cardId: string | null) => void;
    onClose: () => void;
};

export default function SlotPicker({slot, cards, selectedId, onPlace, onClose}: SlotPickerProps) {
    const bestEarnersFirst = useMemo(() => [...cards].sort((a, b) => b.income - a.income), [cards]);

    return (
        <Drawer open onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="h-[85svh]">
                <DrawerHeader className="pb-2">
                    <DrawerTitle>{`Wybierz kartę do slotu ${slot}`}</DrawerTitle>
                    <DrawerDescription>Karta w slocie zarabia monety co godzinę.</DrawerDescription>
                </DrawerHeader>

                <div className="mx-auto w-full max-w-[1200px] flex-1 overflow-y-auto px-4 py-2 md:px-6">
                    {bestEarnersFirst.length === 0 ? (
                        <EmptyState title="Nie masz jeszcze żadnych kart" description="Otwórz paczkę w sklepie!">
                            <Link href="/shop" className={buttonVariants()} onClick={onClose}>
                                Przejdź do sklepu
                            </Link>
                        </EmptyState>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                            {bestEarnersFirst.map((card) => (
                                <button
                                    key={card.id}
                                    aria-pressed={card.id === selectedId}
                                    onClick={() => onPlace(card.id === selectedId ? null : card.id)}
                                    className={cn(
                                        "rounded-lg p-1.5 text-left transition-colors hover:bg-accent",
                                        card.id === selectedId && "bg-lilac",
                                    )}
                                >
                                    <CardTile {...card} visibleNames />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mx-auto flex w-full max-w-[1200px] flex-wrap justify-end gap-2 px-4 py-3 md:px-6">
                    {selectedId && (
                        <Button variant="secondary" onClick={() => onPlace(null)}>
                            Zdejmij kartę
                        </Button>
                    )}
                    <Button variant="outline" onClick={onClose}>
                        Anuluj
                    </Button>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
