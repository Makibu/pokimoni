"use client"

import {usePathname} from "next/navigation";
import Balance from "@/components/data-display/Balance";
import React, {useEffect, useState} from "react";
import UserMenu from "@/components/home/UserMenu";

export default function Navbar() {
    const pathname = usePathname()
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    if (pathname === '/login') return null

    return (
        <>
            <div
                className={`
                flex z-50 w-full items-center justify-center fixed top-0
                backdrop-blur-md shadow-sm transition-all duration-300
                ${scrolled ? "h-12" : "h-16 bg-white/30"}
            `}
            >
                {/*<div className={' absolute left-6 text-red-500 flex gap-2 items-center'}>*/}
                {/*    <HybridTooltip>*/}
                {/*        <HybridTooltipTrigger>*/}
                {/*            <CircleAlert/>*/}
                {/*        </HybridTooltipTrigger>*/}
                {/*        <HybridTooltipContent className={'max-w-96'}>*/}
                {/*            Otwieranie paczek na mniejszych ekranach jest obecnie znacznie utrudnione. Zalecane jest*/}
                {/*            korzystanie z*/}
                {/*            aplikacji na urządzeniach z większą rozdzielczością.*/}
                {/*        </HybridTooltipContent>*/}
                {/*    </HybridTooltip>*/}
                {/*</div>*/}
                <Balance/>
                <div className="absolute right-6 h-12 flex items-center gap-2">
                    <UserMenu/>
                </div>
            </div>
        </>
    )
}
