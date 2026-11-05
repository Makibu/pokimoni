"use client";

import {useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {LoadedImage} from "@/components/ui/loaded-image";
import type {WhoIsItView} from "@/domain/minigames/who-is-it";
import {useMinigameAction} from "@/features/daily/use-daily";
import {cn} from "@/lib/utils";

/** The name and card of the round just played. */
export function LastAnswer({last}: {last: NonNullable<WhoIsItView["last"]>}) {
    return (
        <div className="flex items-center gap-4 rounded-lg bg-secondary p-3">
            <LoadedImage
                src={last.image}
                alt={`Karta: ${last.name}`}
                width={245}
                height={342}
                eager
                className="aspect-[245/342] w-20 shrink-0 rounded-md"
            />
            <div className="min-w-0">
                <p className="font-display text-lg font-bold">{last.correct ? "Dobrze!" : "Niestety nie"}</p>
                <p className="font-medium">To {last.name}</p>
            </div>
        </div>
    );
}

function Clue({round, square}: {round: number; square: boolean}) {
    const [attempt, setAttempt] = useState(0);
    const [failed, setFailed] = useState(false);
    const box = cn("w-full overflow-hidden rounded-lg", square ? "mx-auto aspect-square max-w-56" : "aspect-[5/3]");

    if (failed) {
        return (
            <div role="alert" className={cn(box, "flex flex-col items-center justify-center gap-3 bg-secondary p-4")}>
                <p className="text-center font-medium">Nie udało się wczytać obrazka</p>
                <Button
                    variant="ink"
                    onClick={() => {
                        setFailed(false);
                        setAttempt(attempt + 1);
                    }}
                >
                    Spróbuj ponownie
                </Button>
            </div>
        );
    }

    return (
        <LoadedImage
            key={attempt}
            src={`/api/minigame/picture?round=${round}&attempt=${attempt}`}
            alt="Obrazek do rozpoznania"
            width={480}
            height={square ? 480 : 288}
            eager
            onError={() => setFailed(true)}
            className={box}
        />
    );
}

function TypedAnswer({onAnswer, disabled}: {onAnswer: (answer: string) => void; disabled: boolean}) {
    const [answer, setAnswer] = useState("");

    return (
        <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
                event.preventDefault();
                if (answer.trim()) onAnswer(answer.trim());
            }}
        >
            <Label htmlFor="pokemon-name">Nazwa Pokémona, po angielsku</Label>
            <div className="flex gap-2">
                <Input
                    id="pokemon-name"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    maxLength={60}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                />
                <Button variant="ink" type="submit" disabled={disabled || !answer.trim()}>
                    Sprawdź
                </Button>
            </div>
        </form>
    );
}

export default function WhoIsItGame({view}: {view: WhoIsItView}) {
    const action = useMinigameAction();
    // After an answer the player sees how it went, and moves on when ready.
    const [reviewing, setReviewing] = useState(false);

    function answer(value: string) {
        action.mutate(
            {type: "answer", answer: value},
            {onSuccess: () => setReviewing(true), onError: (error) => toast.error(error.message)},
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
            <p role="status" className="flex flex-wrap justify-between gap-x-4 font-bold">
                <span>
                    Runda {reviewing ? view.round - 1 : view.round} z {view.total}
                </span>
                <span>
                    Trafienia: {view.correct} (potrzeba {view.toWin})
                </span>
            </p>
            {reviewing && view.last ? (
                <>
                    <LastAnswer last={view.last} />
                    <Button variant="ink" className="self-end" onClick={() => setReviewing(false)}>
                        Dalej
                    </Button>
                </>
            ) : (
                <>
                    <Clue key={view.round} round={view.round} square={view.options === null} />
                    {view.options ? (
                        <div data-testid="answers" className="grid grid-cols-2 gap-2">
                            {view.options.map((option) => (
                                <Button
                                    key={option}
                                    variant="secondary"
                                    className="h-auto min-h-11 px-3 py-2 whitespace-normal"
                                    disabled={action.isPending}
                                    onClick={() => answer(option)}
                                >
                                    {option}
                                </Button>
                            ))}
                        </div>
                    ) : (
                        <TypedAnswer key={view.round} onAnswer={answer} disabled={action.isPending} />
                    )}
                </>
            )}
        </div>
    );
}
