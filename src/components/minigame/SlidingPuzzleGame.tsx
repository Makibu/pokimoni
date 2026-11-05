"use client";

import {useEffect, useRef, useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {LoadedImage} from "@/components/ui/loaded-image";
import {type PuzzleView, slideTile} from "@/domain/minigames/sliding-puzzle";
import {useMinigameAction} from "@/features/daily/use-daily";

const GAP = 0;
const MAX_MOVES_PER_REQUEST = 200;
const KEY_OFFSETS: Record<string, {rows: number; columns: number}> = {
    // A key moves a tile in its direction, so the gap goes the opposite way.
    ArrowUp: {rows: 1, columns: 0},
    ArrowDown: {rows: -1, columns: 0},
    ArrowLeft: {rows: 0, columns: 1},
    ArrowRight: {rows: 0, columns: -1},
};

/** Cells to slide, nearest the gap first, so tapping a far tile in the gap's line moves the whole row of them. */
function cellsToSlide(cell: number, gap: number, size: number): number[] {
    const sameRow = Math.floor(cell / size) === Math.floor(gap / size);
    const sameColumn = cell % size === gap % size;
    if (cell === gap || (!sameRow && !sameColumn)) return [];
    const step = (sameRow ? 1 : size) * Math.sign(cell - gap);
    const cells: number[] = [];
    for (let current = gap + step; current !== cell + step; current += step) cells.push(current);
    return cells;
}

function Board({
    view,
    tiles,
    showNumbers,
    onTile,
}: {
    view: PuzzleView;
    tiles: readonly number[];
    showNumbers: boolean;
    onTile: (cell: number) => void;
}) {
    const {size, image} = view;
    const percent = (part: number) => `${part * 100}%`;

    return (
        <div role="group" aria-label="Plansza" className="relative size-full">
            {Array.from({length: size * size - 1}, (_, index) => index + 1).map((tile) => {
                const cell = tiles.indexOf(tile);
                const home = tile - 1;
                return (
                    <button
                        key={tile}
                        type="button"
                        aria-label={`Kafelek ${tile}`}
                        onClick={() => onTile(cell)}
                        className="absolute top-0 left-0 flex items-center justify-center bg-secondary font-display font-bold shadow-[inset_0_0_0_1px_var(--card)] motion-safe:transition-transform motion-safe:duration-100"
                        style={{
                            width: percent(1 / size),
                            height: percent(1 / size),
                            transform: `translate(${(cell % size) * 100}%, ${Math.floor(cell / size) * 100}%)`,
                            backgroundImage: `url(${image})`,
                            backgroundSize: `${size * 100}% ${size * 100}%`,
                            backgroundPosition: `${percent((home % size) / (size - 1))} ${percent(Math.floor(home / size) / (size - 1))}`,
                        }}
                    >
                        {showNumbers && (
                            <span className="flex size-7 items-center justify-center rounded-full bg-ink text-sm text-ink-foreground">
                                {tile}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default function SlidingPuzzleGame({view, finished}: {view: PuzzleView; finished: boolean}) {
    const action = useMinigameAction();
    // Tiles move at once; the server replays the moves in the background and has the last word.
    const [local, setLocal] = useState<{tiles: number[]; moves: number} | null>(null);
    const [preview, setPreview] = useState(false);
    const [showNumbers, setShowNumbers] = useState(false);
    const unsent = useRef<number[]>([]);
    const sending = useRef(false);

    const tiles = local?.tiles ?? view.tiles;
    const moves = local?.moves ?? view.moves;
    const {size} = view;

    function send() {
        if (sending.current || unsent.current.length === 0) return;
        sending.current = true;
        action.mutate(
            {type: "moves", cells: unsent.current.splice(0, MAX_MOVES_PER_REQUEST)},
            {
                onSuccess: () => {
                    sending.current = false;
                    if (unsent.current.length > 0) send();
                    else setLocal(null);
                },
                onError: (error) => {
                    sending.current = false;
                    unsent.current = [];
                    setLocal(null);
                    toast.error(error.message);
                },
            },
        );
    }

    function slide(cell: number) {
        const cells = cellsToSlide(cell, tiles.indexOf(GAP), size);
        if (cells.length === 0) return;
        let next = tiles;
        for (const step of cells) next = slideTile(next, size, step) ?? next;
        setLocal({tiles: next, moves: moves + cells.length});
        unsent.current.push(...cells);
        send();
    }

    function slideByKey({rows, columns}: {rows: number; columns: number}) {
        if (preview) return;
        const gap = tiles.indexOf(GAP);
        const row = Math.floor(gap / size) + rows;
        const column = (gap % size) + columns;
        if (row >= 0 && row < size && column >= 0 && column < size) slide(row * size + column);
    }

    // Kept in a ref, so the listener always moves tiles from the current board.
    const slideByKeyRef = useRef(slideByKey);
    useEffect(() => {
        slideByKeyRef.current = slideByKey;
    });
    useEffect(() => {
        function onKey(event: KeyboardEvent) {
            const offset = KEY_OFFSETS[event.key];
            if (!offset || event.altKey || event.ctrlKey || event.metaKey) return;
            event.preventDefault();
            slideByKeyRef.current(offset);
        }
        if (finished) return;
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [finished]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                {!finished && (
                    <p role="status" className="font-bold">
                        Ruchy: {moves}
                    </p>
                )}
                {!finished && (
                    <div className="flex gap-2">
                        <Button
                            variant={preview ? "ink" : "secondary"}
                            aria-pressed={preview}
                            onClick={() => setPreview(!preview)}
                        >
                            Podgląd
                        </Button>
                        <Button
                            variant={showNumbers ? "ink" : "secondary"}
                            aria-pressed={showNumbers}
                            onClick={() => setShowNumbers(!showNumbers)}
                        >
                            Numery
                        </Button>
                    </div>
                )}
            </div>
            <div className="relative mx-auto aspect-[245/342] w-full max-w-[clamp(15rem,calc((100dvh-19rem)*0.716),24rem)] overflow-hidden rounded-lg bg-secondary">
                {finished || preview ? (
                    <LoadedImage
                        src={view.image}
                        alt={`Karta: ${view.name}`}
                        width={734}
                        height={1024}
                        eager
                        className="size-full"
                    />
                ) : (
                    <Board view={view} tiles={tiles} showNumbers={showNumbers} onTile={slide} />
                )}
            </div>
        </div>
    );
}
