"use client"

import {usePathname} from "next/navigation";
import Balance from "@/components/data-display/Balance";
import React, {useEffect, useState} from "react";
import UserMenu from "@/components/UserMenu";
import {CircleAlert, LucideIcon} from "lucide-react";
import {StaticImageData} from "next/image";
import BannerYellow from "@/public/banners/banner-yellow.png";
import BannerRed from "@/public/banners/banner-red.png";
import BannerGreen from "@/public/banners/banner-green.png";
import BannerBlue from "@/public/banners/banner-blue.png";
import {HybridTooltip, HybridTooltipContent, HybridTooltipTrigger} from "@/components/ui/hybrid-tooltip";


type BannerColor = "yellow" | "red" | "green" | "blue"

const bannerMap: Record<BannerColor, StaticImageData> = {
    yellow: BannerYellow,
    red: BannerRed,
    green: BannerGreen,
    blue: BannerBlue,
}

const colorMap: Record<BannerColor, string> = {
    yellow: "#FFF8B560",
    red: "#FFB5B560",
    green: "#B5FFD960",
    blue: "#B5E0FF60",
}
type Tab = {
    name: string,
    subName: string,
    href: string,
    icon: LucideIcon,
    color: BannerColor,
}

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
                <div className={' absolute left-6 text-red-500 flex gap-2 items-center'}>
                    <HybridTooltip>
                        <HybridTooltipTrigger>
                            <CircleAlert/>
                        </HybridTooltipTrigger>
                        <HybridTooltipContent className={'max-w-96'}>
                            Otwieranie paczek na mniejszych ekranach jest obecnie znacznie utrudnione. Zalecane jest
                            korzystanie z
                            aplikacji na urządzeniach z większą rozdzielczością.
                        </HybridTooltipContent>
                    </HybridTooltip>
                </div>
                <Balance/>
                <div className="absolute right-6 h-12 flex items-center gap-2">
                    <UserMenu/>
                </div>
            </div>
        </>
    )
}
