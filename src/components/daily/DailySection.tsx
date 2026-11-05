"use client";

import {Check} from "lucide-react";
import Link from "next/link";
import {toast} from "sonner";
import MinigameArt from "@/components/daily/MinigameArt";
import {Button} from "@/components/ui/button";
import {ProgressBar} from "@/components/ui/progress-bar";
import {LoadingRegion, Skeleton} from "@/components/ui/skeleton";
import {ErrorState} from "@/components/ui/states";
import {DIFFICULTY_NAMES, GAME_NAMES} from "@/features/daily/labels";
import {useClaimQuest, useMinigame, useQuests} from "@/features/daily/use-daily";
import {coinsAccusative} from "@/lib/format";
import type {QuestView} from "@/server/services/quests";

const QUESTS_FRAME = "flex flex-col gap-4 rounded-section bg-card p-4 md:p-6";
// Dark in both themes, with the dark theme's colours inside, because a picture stands out best on it.
const MINIGAME_FRAME =
    "dark relative isolate flex flex-col justify-between gap-4 overflow-hidden rounded-section bg-card p-4 text-foreground md:p-6";
const GRID = "grid gap-4 lg:grid-cols-[3fr_2fr] lg:gap-5";

function QuestRow({quest}: {quest: QuestView}) {
    const claim = useClaimQuest();
    const finished = quest.progress >= quest.target;

    function handleClaim() {
        claim.mutate(quest.slot, {
            onSuccess: ({reward}) => toast.success(`Odebrano ${coinsAccusative(reward)}!`),
            onError: (error) => toast.error(error.message),
        });
    }

    return (
        <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-secondary p-3">
            <div className="flex min-w-0 flex-1 basis-32 flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="font-bold">{quest.title}</span>
                    <span className="shrink-0 text-sm font-medium">
                        {quest.progress} z {quest.target}
                    </span>
                </div>
                <ProgressBar value={quest.progress} max={quest.target} trackClassName="bg-card" />
            </div>
            {quest.claimed ? (
                <span className="flex h-11 items-center justify-end gap-1.5 text-sm font-bold sm:w-32 sm:justify-center">
                    <Check aria-hidden="true" className="size-4" />
                    Odebrano
                </span>
            ) : finished ? (
                <Button variant="ink" className="px-4 sm:w-32" onClick={handleClaim} disabled={claim.isPending}>
                    Odbierz {quest.reward}
                </Button>
            ) : (
                <span className="flex h-11 items-center justify-end text-sm font-medium whitespace-nowrap sm:w-32 sm:justify-center">
                    {coinsAccusative(quest.reward)}
                </span>
            )}
        </li>
    );
}

function QuestsSkeleton() {
    return (
        <LoadingRegion className={QUESTS_FRAME}>
            <Skeleton className="h-6 w-36 rounded-full" />
            <div className="flex flex-col gap-3">
                {[1, 2, 3].map((slot) => (
                    <Skeleton key={slot} className="h-[68px] rounded-lg" />
                ))}
            </div>
        </LoadingRegion>
    );
}

function QuestsCard() {
    const {data: quests, error, refetch} = useQuests();

    if (!quests) {
        if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
        return <QuestsSkeleton />;
    }

    return (
        <section aria-label="Zadania dnia" className={QUESTS_FRAME}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h2 className="font-display text-lg font-bold md:text-xl">Zadania dnia</h2>
                <p className="text-sm font-medium text-muted-foreground">Nowe o 10:00</p>
            </div>
            <ul className="flex flex-col gap-3">
                {quests.map((quest) => (
                    <QuestRow key={quest.slot} quest={quest} />
                ))}
            </ul>
        </section>
    );
}

function MinigameSkeleton() {
    return (
        <LoadingRegion className={MINIGAME_FRAME}>
            <div className="flex flex-col gap-2">
                <Skeleton className="h-6 w-36 rounded-full" />
                <Skeleton className="h-4 w-44 rounded-full" />
                <Skeleton className="h-4 w-32 rounded-full" />
            </div>
            <Skeleton className="h-11 w-32 rounded-full" />
        </LoadingRegion>
    );
}

const BUTTON_LABELS = {
    not_started: "Zagraj",
    in_progress: "Kontynuuj",
    won: "Zobacz wynik",
    lost: "Zobacz wynik",
};

function MinigameCard() {
    const {data: today, error, refetch} = useMinigame();

    if (!today) {
        if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
        return <MinigameSkeleton />;
    }

    const summary =
        today.status === "won"
            ? `Wygrana! Zdobyto ${coinsAccusative(today.reward)}. Kolejna gra o 10:00.`
            : today.status === "lost"
              ? "Tym razem się nie udało. Kolejna gra o 10:00."
              : `Nagroda za wygraną: ${coinsAccusative(today.reward)}.`;

    return (
        <section aria-label="Minigra dnia" className={MINIGAME_FRAME}>
            <MinigameArt game={today.game} />
            <div className="flex max-w-[62%] flex-col gap-1">
                <h2 className="font-display text-lg font-bold md:text-xl">Minigra dnia</h2>
                <p className="font-bold">
                    {GAME_NAMES[today.game]} · poziom {DIFFICULTY_NAMES[today.difficulty]}
                </p>
                <p className="text-sm font-medium">{summary}</p>
            </div>
            <Button asChild variant="ink" className="self-start">
                <Link href="/minigame">{BUTTON_LABELS[today.status]}</Link>
            </Button>
        </section>
    );
}

export function DailySectionSkeleton() {
    return (
        <div className={GRID}>
            <QuestsSkeleton />
            <MinigameSkeleton />
        </div>
    );
}

export default function DailySection() {
    return (
        <div className={GRID}>
            <QuestsCard />
            <MinigameCard />
        </div>
    );
}
