"use client";

import Link from "next/link";
import {LoadedImage} from "@/components/ui/loaded-image";
import {ProgressBar} from "@/components/ui/progress-bar";
import {usePrefetchSet} from "@/features/game/use-game";
import {cn} from "@/lib/utils";
import type {CollectionSet} from "@/server/services/collection";

export default function SetTile({id, name, total, series, logo, collected}: CollectionSet) {
    const prefetchSet = usePrefetchSet();
    const complete = total > 0 && collected >= total;

    return (
        <Link
            href={`/collection/${id}`}
            onPointerEnter={() => prefetchSet(id)}
            onTouchStart={() => prefetchSet(id)}
            onFocus={() => prefetchSet(id)}
            className={cn(
                "block rounded-tile transition-transform motion-safe:hover:-translate-y-1",
                complete ? "holo-rim p-1" : "bg-card",
            )}
        >
            <div className="flex h-full flex-col gap-3 rounded-[18px] bg-card p-3 md:p-4">
                <div className="rounded-md bg-white p-3">
                    <LoadedImage
                        src={logo}
                        alt=""
                        width={240}
                        height={120}
                        fit="contain"
                        className="h-20 w-full rounded-sm md:h-24"
                    />
                </div>
                <div className="min-w-0">
                    <h2 className="truncate font-bold">{name}</h2>
                    <p className="truncate text-sm text-muted-foreground">{series}</p>
                </div>
                <div className="mt-auto flex flex-col gap-1">
                    <p className="text-sm font-semibold tabular-nums">
                        {collected} z {total}
                    </p>
                    <ProgressBar value={collected} max={total} />
                </div>
            </div>
        </Link>
    );
}
