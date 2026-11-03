"use client";

import Link from "next/link";
import {BookMarked, ChartNoAxesCombined, HomeIcon, ShoppingBag, Trophy} from "lucide-react";
import {usePathname} from "next/navigation";
import useUserAchievementNotification from "@/hooks/queries/useUserAchievementNotification";

export default function Sidebar() {
    const pathname = usePathname();
    const {has_unclaimed_achievements} = useUserAchievementNotification();

    const linkMap = [
        {name: "Home", href: "/", icon: HomeIcon},
        {name: "Shop", href: "/shop", icon: ShoppingBag},
        {name: "Collection", href: "/collection", icon: BookMarked},
        {name: "Achievements", href: "/achievements", icon: Trophy},
        {name: "Statistics", href: "/statistics", icon: ChartNoAxesCombined},
    ];

    if (pathname === "/login") return null;

    return (
        <div className="w-full lg:w-[unset] fixed bottom-0 lg:bottom-[unset] lg:left-6 lg:top-1/2 lg:-translate-y-1/2 z-50">
            <nav className="bg-white border border-gray-200 lg:rounded-2xl shadow-xl backdrop-blur-sm p-3">
                <div className="flex justify-center lg:flex-col gap-2">
                    {linkMap.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                  relative group flex items-center justify-center w-12 h-12 rounded-xl
                  transition-all duration-200 ease-in-out
                  ${
                      isActive
                          ? "bg-blue-500 text-white shadow-md scale-105"
                          : "text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:scale-110"
                  }
                `}
                                title={item.name}
                            >
                                <Icon size={20} className="transition-transform duration-200" />
                                {item.name === "Achievements" && has_unclaimed_achievements && (
                                    <div
                                        className={
                                            "w-4 grid place-items-center text-white absolute top-0 right-0 aspect-square rounded-full bg-red-400 text-[10px]"
                                        }
                                    >
                                        !
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
