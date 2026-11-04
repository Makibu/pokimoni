"use client";

import {ArrowLeft} from "lucide-react";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useDeferredValue, useMemo, useState} from "react";
import CardTile from "@/components/data-display/CardTile";
import {CARD_GRID, CardGridSkeleton} from "@/components/data-display/CollectionSkeletons";
import PageHeader from "@/components/layout/PageHeader";
import {Button, buttonVariants} from "@/components/ui/button";
import ScrollButton from "@/components/ui/ScrollButton";
import {CardFilter, SearchFilter} from "@/components/ui/SearchFilter";
import {Skeleton} from "@/components/ui/skeleton";
import {EmptyState, ErrorState} from "@/components/ui/states";
import {RARITIES, rarityRank} from "@/domain/rarity";
import {useSetCollection} from "@/features/game/use-game";
import {useSettings} from "@/features/settings/use-settings";
import {cardsCount} from "@/lib/format";
import type {CollectionCard} from "@/server/services/collection";

const rarityList: string[] = [...RARITIES];
const DEFAULT_SORT = "rarity-asc";

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
    const {data, error, refetch} = useSetCollection(id);
    const {settings} = useSettings();

    const [search, setSearch] = useState("");
    const [sort, setSort] = useState(DEFAULT_SORT);
    const [activeFilters, setActiveFilters] = useState<string[]>(rarityList);
    const [showOwnedOnly, setShowOwnedOnly] = useState(false);
    // Typing stays smooth while a set with hundreds of cards is filtered.
    const deferredSearch = useDeferredValue(search);

    const visibleCards = useMemo(() => {
        const query = deferredSearch.toLowerCase();
        return (data?.cards ?? [])
            .filter((card) => activeFilters.includes(card.rarity))
            .filter((card) => query === "" || card.name.toLowerCase().includes(query))
            .filter((card) => !showOwnedOnly || card.quantity > 0)
            .sort(comparators[sort] ?? comparators[DEFAULT_SORT]);
    }, [data, deferredSearch, activeFilters, showOwnedOnly, sort]);

    function resetFilters() {
        setSearch("");
        setSort(DEFAULT_SORT);
        setActiveFilters(rarityList);
        setShowOwnedOnly(false);
    }

    const ownedCount = data?.cards.filter((card) => card.quantity > 0).length ?? 0;

    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            <Link href="/collection" className={buttonVariants({variant: "ghost", className: "w-fit -ml-2"})}>
                <ArrowLeft aria-hidden="true" />
                Kolekcja
            </Link>

            <PageHeader title={data ? data.set.name : <Skeleton className="h-8 w-56 rounded-full" />} tone="sun">
                {data && (
                    <p className="font-display text-lg font-bold tabular-nums">
                        {ownedCount} z {data.cards.length}
                    </p>
                )}
            </PageHeader>

            {!data ? (
                error ? (
                    <ErrorState message={error.message} onRetry={() => void refetch()} />
                ) : (
                    <CardGridSkeleton />
                )
            ) : (
                <>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <SearchFilter value={search} onChange={setSearch} />
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
                        <p aria-live="polite" className="ml-auto hidden text-sm font-medium sm:block">
                            {cardsCount(visibleCards.length)}
                        </p>
                    </div>

                    {visibleCards.length > 0 ? (
                        <div className={CARD_GRID}>
                            {visibleCards.map((card) => (
                                <CardTile
                                    key={card.id}
                                    {...card}
                                    setName={data.set.name}
                                    visibleNames={settings.showHiddenPokemonNames}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState title="Brak kart" description="Żadna karta nie pasuje do wybranych filtrów.">
                            <Button variant="secondary" onClick={resetFilters}>
                                Resetuj filtry
                            </Button>
                        </EmptyState>
                    )}
                    <ScrollButton />
                </>
            )}
        </div>
    );
}
