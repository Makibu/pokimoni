"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import Balance from "@/components/data-display/Balance";
import {isActiveLink, NAV_ITEMS} from "@/components/layout/nav-items";
import UserMenu from "@/components/layout/UserMenu";
import {usePlayer, usePrefetchRoute} from "@/features/game/use-game";
import {cn} from "@/lib/utils";

export default function Header() {
    const pathname = usePathname();
    const {data: player} = usePlayer();
    const prefetchRoute = usePrefetchRoute();

    return (
        <div className="sticky top-0 z-40 px-4 pt-2 md:px-6 lg:pt-4">
            <header className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 rounded-full bg-card py-1.5 pr-2 pl-5 shadow-(--lift) lg:pl-6">
                <Link
                    href="/"
                    className="font-display hidden rounded-full text-xl font-bold text-primary sm:block"
                    onPointerEnter={() => prefetchRoute("/")}
                >
                    pokimoni
                </Link>

                <nav aria-label="Główna" className="hidden items-center gap-1 lg:flex">
                    {NAV_ITEMS.map((item) => {
                        const active = isActiveLink(pathname, item.href);
                        const hasDot = item.href === "/achievements" && player?.hasUnclaimedAchievements;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                onPointerEnter={() => prefetchRoute(item.href)}
                                onFocus={() => prefetchRoute(item.href)}
                                className={cn(
                                    "flex h-11 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold transition-colors",
                                    active ? "bg-lilac" : "hover:bg-secondary",
                                )}
                            >
                                {item.label}
                                {hasDot && (
                                    <>
                                        <span aria-hidden="true" className="size-2.5 rounded-full bg-dot" />
                                        <span className="sr-only">, nagrody do odebrania</span>
                                    </>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex flex-1 items-center justify-between gap-2 sm:flex-none">
                    <Balance />
                    <UserMenu />
                </div>
            </header>
        </div>
    );
}
