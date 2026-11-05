"use client";

import {ArrowLeftRight} from "lucide-react";
import {useMemo, useState} from "react";
import {toast} from "sonner";
import CardTile from "@/components/data-display/CardTile";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {LoadedImage} from "@/components/ui/loaded-image";
import {SearchFilter} from "@/components/ui/SearchFilter";
import {LoadingRegion, Skeleton} from "@/components/ui/skeleton";
import {ErrorState} from "@/components/ui/states";
import {MAX_CARD_COPIES} from "@/domain/economy";
import CardBadges from "@/features/pack-opening/CardBadges";
import {useCreateTrade, useTradeOptions} from "@/features/social/use-social";
import {cn} from "@/lib/utils";
import type {PublicPlayer} from "@/server/services/players";
import type {TradableCard} from "@/server/services/trades";

type Side = "mine" | "theirs";

function ChosenSide({
    label,
    card,
    active,
    onClick,
}: {
    label: string;
    card: TradableCard | null;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                "flex min-w-0 flex-1 items-center gap-1.5 rounded-lg p-1.5 text-left transition-colors sm:gap-2 sm:p-2",
                active ? "bg-lilac" : "bg-secondary hover:bg-accent",
            )}
        >
            {card ? (
                <LoadedImage
                    key={card.id}
                    src={card.imageSmall}
                    alt=""
                    width={245}
                    height={342}
                    className="aspect-[245/342] w-9 shrink-0 rounded-[6px] sm:w-11"
                />
            ) : (
                <span
                    aria-hidden="true"
                    className="aspect-[245/342] w-9 shrink-0 rounded-[6px] sm:w-11 border-2 border-dashed border-input"
                />
            )}
            <span className="flex min-w-0 flex-col">
                <span className="text-xs font-bold">{label}</span>
                <span className="truncate text-sm font-medium">{card ? card.name : "Wybierz kartę"}</span>
            </span>
        </button>
    );
}

export default function TradeDialog({partner, onClose}: {partner: PublicPlayer; onClose: () => void}) {
    const options = useTradeOptions(partner.id);
    const createTrade = useCreateTrade();
    const [side, setSide] = useState<Side>("mine");
    const [offered, setOffered] = useState<TradableCard | null>(null);
    const [requested, setRequested] = useState<TradableCard | null>(null);
    const [query, setQuery] = useState("");

    const cards = useMemo(() => {
        const list = options.data?.[side] ?? [];
        const needle = query.trim().toLowerCase();
        return needle ? list.filter((card) => card.name.toLowerCase().includes(needle)) : list;
    }, [options.data, side, query]);

    function showSide(next: Side) {
        setSide(next);
        setQuery("");
    }

    function pick(card: TradableCard) {
        if (side === "mine") {
            setOffered(card.id === offered?.id ? null : card);
            if (!requested && card.id !== offered?.id) showSide("theirs");
        } else {
            setRequested(card.id === requested?.id ? null : card);
            if (!offered && card.id !== requested?.id) showSide("mine");
        }
    }

    function send() {
        if (!offered || !requested) return;
        createTrade.mutate(
            {toUserId: partner.id, offeredCardId: offered.id, requestedCardId: requested.id},
            {
                onSuccess: () => {
                    toast.success(`Oferta wysłana do gracza ${partner.username}`);
                    onClose();
                },
                onError: (error) => toast.error(error.message),
            },
        );
    }

    const chosenHere = side === "mine" ? offered : requested;
    const chosenThere = side === "mine" ? requested : offered;

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="flex max-h-[92svh] flex-col gap-3 p-4 sm:max-w-3xl sm:gap-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="truncate">Wymiana: {partner.username}</DialogTitle>
                    <DialogDescription>Twój egzemplarz jest zablokowany, dopóki oferta jest otwarta.</DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-1 sm:gap-2">
                    <ChosenSide
                        label="Oddajesz"
                        card={offered}
                        active={side === "mine"}
                        onClick={() => showSide("mine")}
                    />
                    <ArrowLeftRight aria-hidden="true" className="size-5 shrink-0" />
                    <ChosenSide
                        label="Otrzymujesz"
                        card={requested}
                        active={side === "theirs"}
                        onClick={() => showSide("theirs")}
                    />
                </div>

                {options.data ? (
                    options.data[side].length === 0 ? (
                        <p className="rounded-lg bg-secondary p-4 text-center text-sm font-medium">
                            {side === "mine"
                                ? "Nie masz wolnych kart. Karty w slotach dochodu i w otwartych ofertach nie mogą trafić do wymiany."
                                : `${partner.username}: brak wolnych kart do wymiany.`}
                        </p>
                    ) : (
                        <>
                            <SearchFilter value={query} onChange={setQuery} />
                            <div className="min-h-40 flex-1 overflow-y-auto" data-testid="trade-cards">
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                                    {cards.map((card) => (
                                        <button
                                            key={card.id}
                                            type="button"
                                            aria-pressed={card.id === chosenHere?.id}
                                            disabled={card.id === chosenThere?.id}
                                            onClick={() => pick(card)}
                                            className={cn(
                                                "rounded-lg p-1 text-left transition-colors hover:bg-accent disabled:opacity-40",
                                                card.id === chosenHere?.id && "bg-lilac hover:bg-lilac",
                                            )}
                                        >
                                            <CardTile
                                                name={card.name}
                                                rarity={card.rarity}
                                                imageSmall={card.imageSmall}
                                                imageLarge={card.imageLarge}
                                                income={card.income}
                                                quantity={card.freeCopies}
                                                visibleNames
                                            />
                                            {side === "theirs" && (
                                                <CardBadges
                                                    isNew={card.yourCopies === 0}
                                                    overLimit={card.yourCopies >= MAX_CARD_COPIES}
                                                    className="mt-1 inline-block"
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {cards.length === 0 && (
                                    <p className="py-6 text-center text-sm text-muted-foreground">
                                        Żadna karta nie pasuje do wyszukiwania.
                                    </p>
                                )}
                            </div>
                        </>
                    )
                ) : options.error ? (
                    <ErrorState message={options.error.message} onRetry={() => void options.refetch()} />
                ) : (
                    <LoadingRegion className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                        {[1, 2, 3, 4, 5].map((tile) => (
                            <Skeleton key={tile} className="aspect-[245/342] rounded-[14px]" />
                        ))}
                    </LoadingRegion>
                )}

                {requested && requested.yourCopies >= MAX_CARD_COPIES && (
                    <p className="rounded-[14px] bg-peach p-3 text-sm font-medium text-foreground">
                        <strong>LIMIT:</strong> masz już {MAX_CARD_COPIES} egzemplarzy karty {requested.name}. Po
                        wymianie otrzymany egzemplarz przepadnie.
                    </p>
                )}

                <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Anuluj
                    </Button>
                    <Button disabled={!offered || !requested || createTrade.isPending} onClick={send}>
                        Wyślij ofertę
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
