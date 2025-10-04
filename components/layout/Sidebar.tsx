"use client"

import Link from "next/link";
import {BookMarked, ChartNoAxesCombined, HomeIcon, ShoppingBag, Trophy} from "lucide-react";
import {usePathname} from "next/navigation";

export default function Sidebar() {
    const pathname = usePathname()

    const linkMap = [
        {name: "Home", href: "/", icon: HomeIcon},
        {name: "Shop", href: "/shop", icon: ShoppingBag},
        {name: "Collection", href: "/collection", icon: BookMarked},
        {name: "Achievements", href: "/achievements", icon: Trophy},
        {name: "Statistics", href: "/statistics", icon: ChartNoAxesCombined}
    ]

    if (pathname === '/login') return null

    return (
        <div className="fixed left-6 top-1/2 -translate-y-1/2 z-50 hidden lg:block">
            <nav className="bg-white border border-gray-200 rounded-2xl shadow-xl backdrop-blur-sm p-3">
                <div className="flex flex-col gap-2">
                    {linkMap.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon

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
                                <Icon size={20} className="transition-transform duration-200"/>

                                <div
                                    className="select-none absolute left-full ml-3 px-3 py-2 text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-2xl"
                                    style={{
                                        backgroundColor: "#ffffff",
                                        color: "#374151",
                                        border: "1px solid #e5e7eb",
                                        zIndex: 9999,
                                        position: "fixed",
                                    }}
                                >
                                    {item.name}
                                    <div
                                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 rotate-45"
                                        style={{
                                            backgroundColor: "#ffffff",
                                            borderLeft: "1px solid #e5e7eb",
                                            borderBottom: "1px solid #e5e7eb",
                                        }}
                                    ></div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}