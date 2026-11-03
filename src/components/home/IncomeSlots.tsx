"use client";

import {useEffect, useState} from "react";
import {Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger} from "@/components/ui/drawer";
import CardTile from "@/components/data-display/CardTile";
import {Button} from "@/components/ui/button";
import {useUserCards} from "@/hooks/queries/useUserCards";
import {UserCardWithCard, UserStats} from "@/lib/types";
import {useUserStats} from "@/hooks/queries/useUserStats";
import {useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import {Card, CardContent} from "@/components/ui/card";
import {Package} from "lucide-react";
import {checkUserBadges} from "@/lib/checkUserBadges";

type CardTileData = {
    id: string;
    name: string;
    rarity: string | null;
    images: {small?: string; large?: string} | null;
    isOwned: boolean;
    income?: number | null;
    quantity?: number;
    original: UserCardWithCard;
};

const rarityOrder: Record<string, number> = {
    common: 1,
    uncommon: 2,
    rare: 3,
    "double rare": 4,
    "ultra rare": 5,
    "ace spec rare": 6,
    "illustration rare": 7,
    "special illustration rare": 8,
    "hyper rare": 9,
    "secret rare": 10,
};

export default function IncomeSlots({setId}: {setId?: string}) {
    const queryClient = useQueryClient();

    const [uid, setUid] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [openSlot, setOpenSlot] = useState<1 | 2 | null>(null);
    const [selectedSlots, setSelectedSlots] = useState<Record<1 | 2, UserCardWithCard | null>>({
        1: null,
        2: null,
    });

    const {data: userCards, isLoading: cardsLoading} = useUserCards(setId);
    const {data: userStats, isLoading: statsLoading} = useUserStats();

    useEffect(() => {
        if (userStats && userCards) {
            const slot1Card = userCards.find((uc) => uc.cards.id === userStats.slot_1);
            const slot2Card = userCards.find((uc) => uc.cards.id === userStats.slot_2);
            setSelectedSlots({
                1: slot1Card ?? null,
                2: slot2Card ?? null,
            });
        }
    }, [userStats, userCards]);

    useEffect(() => {
        const uid = JSON.parse(localStorage.getItem("user") || "{}").uid;
        setUid(uid);
    }, []);

    const cardsForTile =
        userCards?.map((uc) => ({
            id: uc.cards.id,
            name: uc.cards.name,
            rarity: uc.cards.rarity,
            images: uc.cards.images,
            isOwned: uc.quantity! > 0,
            income: uc.cards.income,
            quantity: uc.quantity,
            original: uc,
        })) ?? [];

    const sortedCards = [...cardsForTile].sort(
        (a, b) =>
            (rarityOrder[b.rarity?.toLowerCase() ?? "common"] || 0) -
            (rarityOrder[a.rarity?.toLowerCase() ?? "common"] || 0),
    );

    const handleSelectCard = async (slot: 1 | 2, card: CardTileData) => {
        if (loading) return;
        setLoading(true);

        const current = selectedSlots[slot];
        const newCardId = current?.cards.id === card.id ? null : card.original.cards.id;

        const newSelectedSlots = {
            ...selectedSlots,
            [slot]: newCardId ? card.original : null,
        };
        setSelectedSlots(newSelectedSlots);
        setOpenSlot(null);

        try {
            if (!uid) return;

            const res = await fetch("/api/user/slots?uid=" + uid, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({uid, slot: `slot_${slot}`, card_id: newCardId}),
            });

            if (!res.ok) throw new Error("Nie udało się zaktualizować slotu");

            queryClient.invalidateQueries({queryKey: ["userStats"]});
            queryClient.invalidateQueries({queryKey: ["userSlots"]});
            queryClient.invalidateQueries({queryKey: ["userSlotIncome"]});

            const resStats = await fetch(`/api/user/stats?uid=${uid}`);
            const updatedStats: UserStats = await resStats.json();

            const incomePerHour = (newSelectedSlots[1]?.cards?.income ?? 0) + (newSelectedSlots[2]?.cards?.income ?? 0);

            const newlyEarned = await checkUserBadges(uid, updatedStats!, incomePerHour, "coins_income");

            if (newlyEarned && newlyEarned.length > 0) {
                toast.info(`Zdobyłeś nowe odznaki: ${newlyEarned.map((b) => b.name).join(", ")}`);
            }
        } catch {
            setSelectedSlots(selectedSlots);
            toast.error("Nie udało się zaktualizować karty w slocie");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="xl:absolute xl:top-1/2 xl:right-6 flex gap-2 xl:-translate-y-1/2 z-10 mt-12 xl:mt-0 scale-90 xl:scale-100">
            {[1, 2].map((slotNum) => {
                const selectedCard = selectedSlots[slotNum as 1 | 2];

                const filteredCards = sortedCards.filter((card) => {
                    const isSelectedInOtherSlot =
                        (slotNum === 1 && selectedSlots[2]?.cards.id === card.id) ||
                        (slotNum === 2 && selectedSlots[1]?.cards.id === card.id);

                    if (card.quantity === 1 && isSelectedInOtherSlot) return false;

                    return true;
                });

                const uniqueCards = filteredCards.filter(
                    (card, index, self) => index === self.findIndex((c) => c.id === card.id),
                );

                return (
                    <div key={`slot-${slotNum}`} className="flex flex-col items-center">
                        {statsLoading ? (
                            <Card className="w-[150px] md:w-[200px] aspect-[245/342] bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-dashed border-gray-300 group">
                                <CardContent className="flex flex-col items-center justify-center h-full p-1">
                                    <div className={"w-32 h-32"}>
                                        <LoadingIndicator />
                                    </div>
                                </CardContent>
                            </Card>
                        ) : selectedCard ? (
                            <div
                                className={`w-[150px] md:w-[170px] lg:w-[200px] rounded-md cursor-pointer flex items-center justify-center hover:shadow-md hover:scale-105 transition-all duration-300`}
                                style={{aspectRatio: "300/418"}}
                                onClick={() => setOpenSlot(slotNum as 1 | 2)}
                            >
                                <img
                                    src={selectedCard.cards.images?.small}
                                    alt={selectedCard.cards.name}
                                    className="w-full h-full object-cover rounded"
                                />
                            </div>
                        ) : (
                            <Card
                                className="w-[150px] md:w-[200px] aspect-[245/342] bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 transition-all duration-300 hover:scale-[1.03] cursor-pointer group"
                                onClick={() => setOpenSlot(slotNum as 1 | 2)}
                            >
                                <CardContent className="flex flex-col items-center justify-center h-full p-1">
                                    <div className="w-12 h-12 rounded-full bg-gray-300 group-hover:bg-blue-300 flex items-center justify-center mb-4 transition-colors duration-300">
                                        <Package className="h-8 w-8 text-gray-500 group-hover:text-blue-600 transition-colors duration-300" />
                                    </div>
                                    <p className="text-gray-500 group-hover:text-blue-600 font-medium text-center transition-colors duration-300">
                                        Slot na kartę #{slotNum}
                                    </p>
                                    <p className="text-xs text-gray-400 group-hover:text-blue-500 mt-2 text-center transition-colors duration-300">
                                        Kliknij aby dodać
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        <Drawer open={openSlot === slotNum} onOpenChange={(open) => !open && setOpenSlot(null)}>
                            <DrawerTrigger asChild>
                                <Button className="hidden">Open Drawer</Button>
                            </DrawerTrigger>
                            <DrawerContent className="h-[85vh]">
                                <DrawerHeader>
                                    <DrawerTitle>{`Wybierz kartę do slotu ${slotNum}`}</DrawerTitle>
                                </DrawerHeader>
                                {cardsLoading ? (
                                    <LoadingIndicator />
                                ) : (
                                    <div className="px-8 pt-5 overflow-y-scroll">
                                        <div className="grid grid-cols-3 md:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 max-w-full">
                                            {uniqueCards.map((card, index) => (
                                                <div
                                                    key={`${card.id}-${index}`}
                                                    onClick={() => handleSelectCard(slotNum as 1 | 2, card)}
                                                    className="cursor-pointer hover:scale-[1.03] transition-all"
                                                >
                                                    <CardTile {...card} visibleNames={true} />
                                                </div>
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
    );
}
