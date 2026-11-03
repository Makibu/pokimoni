"use client";

import {useParams} from "next/navigation";
import {useMemo, useState} from "react";
import CardTile from "@/components/data-display/CardTile";
import ScrollButton from "@/components/ui/ScrollButton";
import {CardFilter, SearchFilter} from "@/components/ui/SearchFilter";
import {RARITIES, rarityRank} from "@/domain/rarity";
import {useSetCollection} from "@/features/game/use-game";
import {useSettings} from "@/features/settings/use-settings";
import type {CollectionCard} from "@/server/services/collection";

const rarityList: string[] = [...RARITIES];

function cardNumber(card: CollectionCard) {
    return Number.parseInt(card.id.split("-")[1] ?? "0", 10);
}

const acquiredTime = (card: CollectionCard) => (card.firstAcquiredAt ? new Date(card.firstAcquiredAt).getTime() : 0);

const comparators: Record<string, (a: CollectionCard, b: CollectionCard) => number> = {
    "rarity-asc": (a, b) => rarityRank(a.rarity) - rarityRank(b.rarity) || cardNumber(a) - cardNumber(b),
    "rarity-desc": (a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || cardNumber(a) - cardNumber(b),
    newest: (a, b) => acquiredTime(b) - acquiredTime(a),
    oldest: (a, b) => acquiredTime(a) - acquiredTime(b),
    "name-asc": (a, b) => a.name.localeCompare(b.name),
    "name-desc": (a, b) => b.name.localeCompare(a.name),
};

export default function SetCollectionPage() {
    const {id} = useParams<{id: string}>();
    const {data, isLoading, error} = useSetCollection(id);
    const {settings} = useSettings();

    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("rarity-asc");
    const [activeFilters, setActiveFilters] = useState<string[]>(rarityList);
    const [showOwnedOnly, setShowOwnedOnly] = useState(false);

    const visibleCards = useMemo(() => {
        const query = search.toLowerCase();
        return (data?.cards ?? [])
            .filter((card) => activeFilters.includes(card.rarity))
            .filter((card) => query === "" || card.name.toLowerCase().includes(query))
            .filter((card) => !showOwnedOnly || card.quantity > 0)
            .sort(comparators[sort] ?? comparators["rarity-asc"]);
    }, [data, search, activeFilters, showOwnedOnly, sort]);

    function resetFilters() {
        setSort("rarity-asc");
        setActiveFilters(rarityList);
    }

    if (isLoading) return <p>Ładowanie...</p>;
    if (error) return <p>Błąd: {error.message}</p>;

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
                {visibleCards.map((card) => (
                    <CardTile key={card.id} {...card} visibleNames={settings.showHiddenPokemonNames} isInIndex />
                ))}
            </div>
            <ScrollButton />
        </div>
    );
}
