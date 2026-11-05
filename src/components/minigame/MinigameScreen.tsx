"use client";

import Link from "next/link";
import {toast} from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import MemoryGame from "@/components/minigame/MemoryGame";
import SlidingPuzzleGame from "@/components/minigame/SlidingPuzzleGame";
import WhoIsItGame, {LastAnswer} from "@/components/minigame/WhoIsItGame";
import {Button} from "@/components/ui/button";
import {LoadingRegion, Skeleton} from "@/components/ui/skeleton";
import {ErrorState} from "@/components/ui/states";
import type {MinigameView} from "@/domain/minigames";
import {DIFFICULTY_NAMES, GAME_NAMES, gameRules} from "@/features/daily/labels";
import {useMinigame, useStartMinigame} from "@/features/daily/use-daily";
import {coinsAccusative} from "@/lib/format";
import type {MinigameToday} from "@/server/services/minigames";
import {cn} from "@/lib/utils";

const PANEL = "flex flex-col gap-4 rounded-section bg-card p-4 md:p-6";

const SCREEN = "flex flex-col gap-4 lg:gap-6";

export function MinigameHeader() {
    return <PageHeader title="Minigra dnia" description="Jedna gra dziennie, dla wszystkich ta sama" tone="aqua" />;
}

export function MinigameSkeleton() {
    return (
        <LoadingRegion className={PANEL}>
            <Skeleton className="h-7 w-52 rounded-full" />
            <Skeleton className="h-4 w-full max-w-md rounded-full" />
            <Skeleton className="h-4 w-44 rounded-full" />
            <Skeleton className="h-11 w-32 rounded-full" />
        </LoadingRegion>
    );
}

function Title({today}: {today: MinigameToday}) {
    return (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h2 className="font-display text-lg font-bold md:text-xl">{GAME_NAMES[today.game]}</h2>
            <p className="text-sm font-medium text-muted-foreground">Poziom {DIFFICULTY_NAMES[today.difficulty]}</p>
        </div>
    );
}

function StartPanel({today}: {today: MinigameToday}) {
    const start = useStartMinigame();

    return (
        <section className={PANEL}>
            <Title today={today} />
            <div className="flex flex-col gap-1">
                <p className="max-w-2xl font-medium">{gameRules(today.game, today.difficulty)}</p>
                <p className="max-w-2xl text-sm font-medium text-muted-foreground">
                    Nagroda za wygraną: {coinsAccusative(today.reward)}. Masz jedną próbę dziennie, a postęp zapisuje
                    się po każdym ruchu.
                </p>
            </div>
            <Button
                variant="ink"
                className="self-start"
                disabled={start.isPending}
                onClick={() => start.mutate(undefined, {onError: (error) => toast.error(error.message)})}
            >
                Zacznij
            </Button>
        </section>
    );
}

function scoreOf(view: MinigameView): string {
    switch (view.game) {
        case "who_is_it":
            return `Dobre odpowiedzi: ${view.correct} z ${view.total}.`;
        case "memory":
            return `Pomyłki: ${view.mistakes}.`;
        case "sliding_puzzle":
            return `Ruchy: ${view.moves}.`;
    }
}

function ResultPanel({today, view}: {today: MinigameToday; view: MinigameView}) {
    const won = today.status === "won";

    return (
        <section
            className={cn(
                "flex flex-wrap items-center justify-between gap-4 rounded-section p-4 md:p-6",
                won ? "bg-sun" : "bg-peach",
            )}
        >
            <div className="flex min-w-0 flex-col gap-1">
                <h2 className="font-display text-lg font-bold md:text-xl">
                    {won ? `Wygrana! Zdobyto ${coinsAccusative(today.reward)}` : "Tym razem się nie udało"}
                </h2>
                <p className="font-medium">{scoreOf(view)} Kolejna gra o 10:00.</p>
            </div>
            <Button asChild variant="ink">
                <Link href="/">Wróć na stronę główną</Link>
            </Button>
        </section>
    );
}

function Game({view, finished}: {view: MinigameView; finished: boolean}) {
    switch (view.game) {
        case "who_is_it":
            return finished ? view.last && <LastAnswer last={view.last} /> : <WhoIsItGame view={view} />;
        case "memory":
            return <MemoryGame view={view} finished={finished} />;
        case "sliding_puzzle":
            return <SlidingPuzzleGame view={view} finished={finished} />;
    }
}

export default function MinigameScreen() {
    const {data: today, error, refetch} = useMinigame();

    if (!today) {
        return (
            <div className={SCREEN}>
                <MinigameHeader />
                {error ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : <MinigameSkeleton />}
            </div>
        );
    }
    if (today.status === "not_started" || !today.view) {
        return (
            <div className={SCREEN}>
                <MinigameHeader />
                <StartPanel today={today} />
            </div>
        );
    }

    const finished = today.status !== "in_progress";
    return (
        // During play the board gets the whole screen, so the answers fit on a phone without scrolling.
        <div className={SCREEN}>
            {finished && <MinigameHeader />}
            {finished && <ResultPanel today={today} view={today.view} />}
            <section className={PANEL}>
                {!finished && <Title today={today} />}
                <Game view={today.view} finished={finished} />
            </section>
        </div>
    );
}
