"use client"

import {usePathname} from "next/navigation";
import Balance from "@/components/data-display/Balance";
import React, {useEffect, useState} from "react";
import UserMenu from "@/components/UserMenu";
import {BookMarked, ChartNoAxesCombined, ListIcon, LucideIcon, ShoppingBag, Trophy} from "lucide-react";
import {AnimatePresence, motion} from "framer-motion";
import Link from "next/link";
import Image, {StaticImageData} from "next/image";
import BannerYellow from "@/public/banners/banner-yellow.png";
import BannerRed from "@/public/banners/banner-red.png";
import BannerGreen from "@/public/banners/banner-green.png";
import BannerBlue from "@/public/banners/banner-blue.png";


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
    const [isMenuOpenned, setIsMenuOpenned] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    // blokowanie scrolla w tle
    useEffect(() => {
        if (isMenuOpenned) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
    }, [isMenuOpenned]);

    if (pathname === '/login') return null

    function handleMenuToggle() {
        setIsMenuOpenned(prev => !prev)
    }

    const tabs: Tab[] = [
        {name: "Sklep", subName: "Kupuj i otwieraj", href: "/shop", icon: ShoppingBag, color: "yellow"},
        {name: "Indeks", subName: "Twoja kolekcja", href: "/index", icon: BookMarked, color: "red"},
        {name: "Osiągnięcia", subName: "Osiągaj sukcesy", href: "/achievements", icon: Trophy, color: "blue"},
        {
            name: "Statystyki",
            subName: "Twoje wyniki",
            href: "/statistics",
            icon: ChartNoAxesCombined,
            color: "green"
        },
    ]

    return (
        <>
            <div
                className={`
                flex z-50 w-full items-center justify-center fixed top-0
                backdrop-blur-md shadow-sm transition-all duration-300
                ${scrolled ? "h-12" : "h-16 bg-white/30"}
            `}
            >
                <ListIcon
                    className="absolute left-4 lg:hidden z-30 cursor-pointer"
                    onClick={handleMenuToggle}
                />
                <Balance/>
                <div className="absolute right-6 h-12 flex items-center gap-2">
                    <UserMenu/>
                </div>
            </div>

            <AnimatePresence>
                {isMenuOpenned && (
                    <motion.div
                        initial={{y: "-100%"}}
                        animate={{y: 0}}
                        exit={{y: "-100%"}}
                        transition={{duration: 0.4, ease: "easeInOut"}}
                        className="fixed inset-0 bg-white z-20 flex flex-col items-center justify-center space-y-8 text-xl font-semibold px-6"
                    >
                        {tabs.map((tab, index) => {
                            const Icon = tab.icon
                            return (
                                <Link href={tab.href} key={index} style={{backgroundColor: colorMap[tab.color]}}
                                      onClick={handleMenuToggle}
                                      className={'h-24 w-full max-w-96 border-[1px] border-black/50 rounded-3xl flex justify-center items-center relative backdrop-blur-md bg-opacity-50 shadow-lg transition-transform hover:scale-105'}>
                                    <Icon className={'w-12 h-12 absolute left-6'} strokeWidth={1}/>
                                    <div className="flex flex-col items-center">
                                        <h1 className="text-2xl font-bold tracking-wide drop-shadow-sm">
                                            {tab.name}
                                        </h1>
                                        <p className="text-xs text-gray-700 opacity-80">
                                            {tab.subName}
                                        </p>
                                    </div>
                                    <Image src={bannerMap[tab.color]} alt={"Banner-green"} width={90} height={90}
                                           className={'absolute right-2'}/>
                                </Link>
                            )
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
