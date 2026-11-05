"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {isActiveLink, NAV_ITEMS} from "@/components/layout/nav-items";
import {usePlayer, usePrefetchRoute} from "@/features/game/use-game";
import {cn} from "@/lib/utils";

export default function BottomNav() {
    const pathname = usePathname();
    const {data: player} = usePlayer();
    const prefetchRoute = usePrefetchRoute();

    return (
        <nav
            aria-label="Główna"
            className="fixed inset-x-4 bottom-3 z-40 mx-auto grid max-w-md grid-cols-6 rounded-full bg-nav p-1.5 text-nav-foreground shadow-(--lift) lg:hidden"
        >
            {NAV_ITEMS.map((item) => {
                const active = isActiveLink(pathname, item.href);
                const hasDot = item.href === "/achievements" && player?.hasUnclaimedAchievements;
                const Icon = item.icon;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        aria-label={hasDot ? `${item.label}, nagrody do odebrania` : item.label}
                        aria-current={active ? "page" : undefined}
                        title={item.label}
                        onTouchStart={() => prefetchRoute(item.href)}
                        onPointerEnter={() => prefetchRoute(item.href)}
                        className={cn(
                            "relative flex h-12 items-center justify-center rounded-full transition-colors",
                            active && "bg-white text-[#221b4b]",
                        )}
                    >
                        <Icon aria-hidden="true" className="size-[22px]" />
                        {hasDot && (
                            <span
                                aria-hidden="true"
                                className="absolute top-2.5 right-[calc(50%-14px)] size-2.5 rounded-full bg-[#ff5c70]"
                            />
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}
