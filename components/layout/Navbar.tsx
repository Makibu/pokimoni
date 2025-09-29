"use client"

import {usePathname} from "next/navigation";
import Balance from "@/components/data-display/Balance";
import {useEffect, useState} from "react";
import UserMenu from "@/components/UserMenu";

export default function Navbar() {
    const pathname = usePathname()

    const [scrolled, setScrolled] = useState(false);


    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setScrolled(true)
            } else {
                setScrolled(false)
            }
        }

        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    if (pathname === '/login') return null

    return (
        <>
            <div
                className={`
                flex z-20 w-full items-center justify-center fixed 
                backdrop-blur-md shadow-sm transition-all duration-300
                ${scrolled ? "h-12" : "h-16 bg-white/30"}
            `}
            >
                <Balance/>
                <div className={'absolute right-6 h-12 flex items-center gap-2'}>
                    <UserMenu/>
                </div>
            </div>

        </>

    )
}