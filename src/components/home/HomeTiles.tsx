"use client";

import Link from "next/link";
import {usePlayer, usePrefetchRoute, useShop} from "@/features/game/use-game";
import {formatNumber} from "@/lib/format";
import {cn} from "@/lib/utils";

export default function HomeTiles() {
    const {data: player} = usePlayer();
    const {data: shop} = useShop();
    const prefetchRoute = usePrefetchRoute();

    const tiles = [
        {name: "Sklep", detail: "Kupuj i otwieraj", href: "/shop", tone: "bg-lilac", dot: false},
        {
            name: "Kolekcja",
            detail: shop
                ? `${formatNumber(shop.uniqueCards)} z ${formatNumber(shop.catalogCards)} kart`
                : "Twoja kolekcja",
            href: "/collection",
            tone: "bg-sun",
            dot: false,
        },
        {
            name: "Osiągnięcia",
            detail: player?.hasUnclaimedAchievements ? "Nagrody do odebrania" : "Osiągaj sukcesy",
            href: "/achievements",
            tone: "bg-pink",
            dot: player?.hasUnclaimedAchievements ?? false,
        },
        {name: "Statystyki", detail: "Twoje wyniki", href: "/statistics", tone: "bg-peach", dot: false},
    ];

    return (
        <div className="grid grid-cols-2 gap-3">
            {tiles.map((tile) => (
                <Link
                    key={tile.href}
                    href={tile.href}
                    onPointerEnter={() => prefetchRoute(tile.href)}
                    onTouchStart={() => prefetchRoute(tile.href)}
                    onFocus={() => prefetchRoute(tile.href)}
                    className={cn(
                        "flex min-w-0 flex-col gap-0.5 rounded-tile px-4 py-3 transition-transform motion-safe:hover:-translate-y-0.5",
                        tile.tone,
                    )}
                >
                    <span className="flex items-center gap-1.5 text-[15px] font-bold">
                        {tile.name}
                        {tile.dot && <span aria-hidden="true" className="size-2.5 rounded-full bg-dot" />}
                    </span>
                    <span className="text-[13px] font-medium tabular-nums">{tile.detail}</span>
                </Link>
            ))}
        </div>
    );
}
