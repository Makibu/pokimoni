"use client";

import {useMemo, useState} from "react";
import {toast} from "sonner";
import CardTile from "@/components/data-display/CardTile";
import {Button} from "@/components/ui/button";
import {DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {SearchFilter} from "@/components/ui/SearchFilter";
import {LoadingRegion, Skeleton} from "@/components/ui/skeleton";
import {ErrorState} from "@/components/ui/states";
import {
    MAX_PROFILE_STATS,
    MAX_SHOWCASE_CARDS,
    PROFILE_STAT_LABELS,
    PROFILE_STATS,
    type ProfileStat,
} from "@/domain/profile";
import {useOwnedCards} from "@/features/game/use-game";
import {useProfileChoices, useUpdateProfile} from "@/features/social/use-social";
import {cn} from "@/lib/utils";
import type {CollectionCard} from "@/server/services/collection";

function toggled<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

function EditorForm({
    ownedCards,
    initialStats,
    initialShowcase,
    onDone,
}: {
    ownedCards: CollectionCard[];
    initialStats: ProfileStat[];
    initialShowcase: string[];
    onDone: () => void;
}) {
    const updateProfile = useUpdateProfile();
    const [stats, setStats] = useState(initialStats);
    const [showcase, setShowcase] = useState(initialShowcase);
    const [query, setQuery] = useState("");

    const cards = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return needle ? ownedCards.filter((card) => card.name.toLowerCase().includes(needle)) : ownedCards;
    }, [ownedCards, query]);

    function save() {
        updateProfile.mutate(
            {stats, showcase},
            {
                onSuccess: () => {
                    toast.success("Profil zapisany");
                    onDone();
                },
                onError: (error) => toast.error(error.message),
            },
        );
    }

    return (
        <>
            <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-bold">
                    Statystyki: {stats.length} z {MAX_PROFILE_STATS}
                </legend>
                <div className="flex flex-wrap gap-2">
                    {PROFILE_STATS.map((stat) => {
                        const selected = stats.includes(stat);
                        return (
                            <button
                                key={stat}
                                type="button"
                                aria-pressed={selected}
                                disabled={!selected && stats.length >= MAX_PROFILE_STATS}
                                onClick={() => setStats(toggled(stats, stat))}
                                className={cn(
                                    "min-h-11 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-50",
                                    selected ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-accent",
                                )}
                            >
                                {PROFILE_STAT_LABELS[stat]}
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            <fieldset className="flex min-h-0 flex-col gap-2">
                <legend className="mb-2 text-sm font-bold">
                    Gablota: {showcase.length} z {MAX_SHOWCASE_CARDS}
                </legend>
                {ownedCards.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Nie masz jeszcze kart. Otwórz paczkę w sklepie, a będzie czym się pochwalić.
                    </p>
                ) : (
                    <>
                        <SearchFilter value={query} onChange={setQuery} />
                        <div className="max-h-[36svh] overflow-y-auto" data-testid="showcase-picker">
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                                {cards.map((card) => {
                                    const position = showcase.indexOf(card.id);
                                    const selected = position !== -1;
                                    return (
                                        <button
                                            key={card.id}
                                            type="button"
                                            aria-pressed={selected}
                                            disabled={!selected && showcase.length >= MAX_SHOWCASE_CARDS}
                                            onClick={() => setShowcase(toggled(showcase, card.id))}
                                            className={cn(
                                                "relative rounded-lg p-1 text-left transition-colors hover:bg-accent disabled:opacity-50",
                                                selected && "bg-lilac hover:bg-lilac",
                                            )}
                                        >
                                            <CardTile
                                                name={card.name}
                                                rarity={card.rarity}
                                                imageSmall={card.imageSmall}
                                                imageLarge={card.imageLarge}
                                                income={card.income}
                                                quantity={1}
                                                visibleNames
                                            />
                                            {selected && (
                                                <span className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                                    {position + 1}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </fieldset>

            <div className="sticky bottom-0 -mb-6 flex flex-wrap justify-end gap-2 bg-card pt-2 pb-6">
                <Button variant="outline" onClick={onDone}>
                    Anuluj
                </Button>
                <Button disabled={stats.length === 0 || updateProfile.isPending} onClick={save}>
                    Zapisz profil
                </Button>
            </div>
        </>
    );
}

export default function ProfileEditor({onDone}: {onDone: () => void}) {
    const choices = useProfileChoices();
    const owned = useOwnedCards();
    const error = choices.error ?? owned.error;

    return (
        <>
            <DialogHeader>
                <DialogTitle>Edytuj profil</DialogTitle>
            </DialogHeader>
            {/* A refresh after saving may still be running, and the form takes its starting values only once. */}
            {choices.data && !choices.isFetching && owned.data ? (
                <EditorForm
                    ownedCards={owned.data}
                    initialStats={choices.data.stats}
                    initialShowcase={choices.data.showcase}
                    onDone={onDone}
                />
            ) : error ? (
                <ErrorState message={error.message} />
            ) : (
                <LoadingRegion className="flex flex-col gap-3">
                    <Skeleton className="h-24 rounded-lg" />
                    <Skeleton className="h-64 rounded-lg" />
                </LoadingRegion>
            )}
        </>
    );
}
