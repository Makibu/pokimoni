"use client";

import {useQuery} from "@tanstack/react-query";
import {Card} from "@/lib/types";
import {useParams} from "next/navigation";
import CardTile from "@/components/data-display/CardTile";
import ScrollButton from "@/components/ui/ScrollButton";
import {useState} from "react";
import {CardFilter, SearchFilter} from "@/components/ui/SearchFilter";
import {useUserCards} from "@/hooks/queries/useUserCards";
import {useAuth} from "@/context/authContext";

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

const rarityList = Object.keys(rarityOrder);

export default function IndexPage() {
    const [search, setSearch] = useState<string>("");
    const [sort, setSort] = useState<string>("rarity-asc");
    const [activeFilters, setActiveFilters] = useState<string[]>(rarityList);
    const [showOwnedOnly, setShowOwnedOnly] = useState<boolean>(false);
    const {settings} = useAuth();

    const {id} = useParams<{id: string}>();

    const {
        data: cardList,
        isLoading: isCardsLoading,
        error: cardsError,
    } = useQuery({
        queryKey: ["cards", id],
        queryFn: async ({signal}) => {
            const res = await fetch(`/api/cards/${id}`, {signal});
            if (!res.ok) throw new Error("Nie udało się pobrać kart");
            return res.json();
        },
    });

    const {data: userCards, isLoading: isUserCardsLoading, error: userCardsError} = useUserCards(id);

    if (isCardsLoading || isUserCardsLoading) return <p>Ładowanie...</p>;
    if (cardsError instanceof Error) return <p>Błąd: {cardsError.message}</p>;
    if (userCardsError instanceof Error) return <p>Błąd: {userCardsError.message}</p>;

    const cards: Card[] = cardList?.cards || [];
    const userCardsList = userCards || [];

    const userCardsMap: Record<string, {acquired_at: string}> = {};
    userCardsList.forEach((uc) => {
        userCardsMap[uc.card_id] = {acquired_at: uc.acquired_at ?? new Date().toISOString()};
    });

    const mergedCards: (Card & {acquired_at?: string; isOwned: boolean})[] = cards.map((card) => ({
        ...card,
        acquired_at: card.id ? userCardsMap[card.id]?.acquired_at : undefined,
        isOwned: !!card.id && !!userCardsMap[card.id],
    }));

    const sortedCards: (Card & {acquired_at?: string; isOwned: boolean})[] = mergedCards.slice().sort((a, b) => {
        const aRarity = rarityOrder[a.rarity?.toLowerCase() || "common"] || 0;
        const bRarity = rarityOrder[b.rarity?.toLowerCase() || "common"] || 0;
        if (aRarity !== bRarity) return aRarity - bRarity;

        const aNum = parseInt(a.id?.split("-")[1] || "0", 10);
        const bNum = parseInt(b.id?.split("-")[1] || "0", 10);
        return aNum - bNum;
    });

    function resetFilters() {
        setSort("rarity-asc");
        setActiveFilters(rarityList);
    }

    const filteredCards = sortedCards
        .filter((card) => activeFilters.includes(card.rarity?.toLowerCase() || ""))
        .filter((card) => card.name?.toLowerCase().includes(search.toLowerCase()) || search === "")
        .filter((card) => !showOwnedOnly || card.isOwned)
        .sort((a, b) => {
            switch (sort) {
                case "rarity-asc":
                    return rarityOrder[a.rarity?.toLowerCase() || ""] - rarityOrder[b.rarity?.toLowerCase() || ""];
                case "rarity-desc":
                    return rarityOrder[b.rarity?.toLowerCase() || ""] - rarityOrder[a.rarity?.toLowerCase() || ""];
                case "newest":
                    return new Date(b.acquired_at || 0).getTime() - new Date(a.acquired_at || 0).getTime();
                case "oldest":
                    return new Date(a.acquired_at || 0).getTime() - new Date(b.acquired_at || 0).getTime();
                case "name-asc":
                    return (a.name || "").localeCompare(b.name || "");
                case "name-desc":
                    return (b.name || "").localeCompare(a.name || "");
                default:
                    return 0;
            }
        });

    return (
        <div
            className={
                "overflow-x-hidden flex flex-col px-6 md:px-16 lg:px-32 pb-32 bg-gradient-to-br from-white via-blue-50/30 to-slate-50"
            }
        >
            <div className={"flex mt-32 mb-6 z-10 items-center gap-4"}>
                <SearchFilter onSearch={setSearch} />
                <CardFilter
                    rarityList={rarityList}
                    activeFilters={activeFilters}
                    setActiveFilters={setActiveFilters}
                    sort={sort}
                    setSort={setSort}
                    resetFilters={resetFilters}
                    showOwnedOnly={showOwnedOnly}
                    setShowOwnedOnly={setShowOwnedOnly}
                />
            </div>
            <div className={"flex gap-8 flex-wrap justify-center"}>
                {filteredCards.map((card, index) => (
                    <CardTile key={index} {...card} visibleNames={settings.showHiddenPokemonNames} isInIndex />
                ))}
            </div>
            <ScrollButton />
        </div>
    );
}
