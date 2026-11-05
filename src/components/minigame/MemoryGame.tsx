"use client";

import {useEffect, useState} from "react";
import {toast} from "sonner";
import {LoadedImage} from "@/components/ui/loaded-image";
import type {MemoryPosition, MemoryView} from "@/domain/minigames/memory";
import {useMinigameAction} from "@/features/daily/use-daily";
import {cn} from "@/lib/utils";

/** Long enough to remember both cards. The server turns them back anyway on the next flip. */
const MISMATCH_SHOWN_MS = 1400;

const GRIDS: Record<MemoryView["difficulty"], string> = {
    easy: "grid-cols-4 sm:grid-cols-6",
    medium: "grid-cols-4 sm:grid-cols-8",
    hard: "grid-cols-5 sm:grid-cols-8",
};

function Position({
    number,
    position,
    waiting,
    onFlip,
}: {
    number: number;
    position: MemoryPosition;
    waiting: boolean;
    onFlip: () => void;
}) {
    const hidden = position.status === "hidden";
    const label = hidden
        ? `Karta ${number}, zakryta`
        : position.status === "open"
          ? `Karta ${number}: ${position.name}`
          : `Karta ${number}: ${position.name}, para znaleziona`;

    return (
        <button
            type="button"
            aria-label={label}
            disabled={position.status === "matched"}
            onClick={onFlip}
            className={cn(
                "relative aspect-[245/342] overflow-hidden rounded-md",
                hidden && "border-2 border-[#3b24b8] bg-(image:--card-back)",
                waiting && "animate-pulse",
                position.status === "matched" && "opacity-60",
            )}
        >
            {!hidden && (
                <LoadedImage src={position.image} alt="" width={245} height={342} eager className="size-full" />
            )}
        </button>
    );
}

export default function MemoryGame({view, finished}: {view: MemoryView; finished: boolean}) {
    const action = useMinigameAction();
    // Taps arrive faster than answers, and the server has to see them in order.
    const [queue, setQueue] = useState<number[]>([]);
    const [turnedBackAt, setTurnedBackAt] = useState(0);
    const {mismatch, mistakes} = view;

    useEffect(() => {
        if (!mismatch || finished) return;
        const timer = setTimeout(() => setTurnedBackAt(mistakes), MISMATCH_SHOWN_MS);
        return () => clearTimeout(timer);
    }, [mismatch, mistakes, finished]);

    const [next] = queue;
    const {mutate, isPending} = action;
    useEffect(() => {
        if (next === undefined || isPending || finished) return;
        mutate(
            {type: "flip", position: next},
            {
                onSuccess: () => setQueue((waiting) => waiting.slice(1)),
                onError: (error) => {
                    setQueue([]);
                    toast.error(error.message);
                },
            },
        );
    }, [next, isPending, finished, mutate]);

    const turnedBack = mismatch && turnedBackAt === mistakes;
    const positions = view.positions.map((position): MemoryPosition =>
        turnedBack && position.status === "open" ? {status: "hidden"} : position,
    );
    const found = view.positions.filter((position) => position.status === "matched").length / 2;

    return (
        <div className="flex flex-col gap-4">
            {!finished && (
                <p role="status" className="flex flex-wrap justify-between gap-x-4 font-bold">
                    <span>
                        Pary: {found} z {view.positions.length / 2}
                    </span>
                    <span>
                        Pomyłki: {mistakes}
                        {view.mistakeLimit !== null && ` z ${view.mistakeLimit}`}
                    </span>
                </p>
            )}
            <div className={cn("grid gap-2", GRIDS[view.difficulty])}>
                {positions.map((position, index) => (
                    <Position
                        key={index}
                        number={index + 1}
                        position={position}
                        waiting={queue.includes(index)}
                        onFlip={() => {
                            // A card shown by a mismatch can be turned again, as the server closes those first.
                            const isOpen = position.status === "open" && !mismatch;
                            if (finished || isOpen || queue.includes(index)) return;
                            setQueue([...queue, index]);
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
