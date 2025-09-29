"use client"

import Link from "next/link";
import {BookMarked, ChartNoAxesCombined, Info, LucideIcon, ShoppingBag, Trophy} from "lucide-react";
import PokemonBackground2 from "@/public/pokemon-background-2.jpg";
import Image, {StaticImageData} from "next/image";
import React, {useState} from "react";

import BannerYellow from "@/public/banners/banner-yellow.png"
import BannerRed from "@/public/banners/banner-red.png"
import BannerGreen from "@/public/banners/banner-green.png"
import BannerBlue from "@/public/banners/banner-blue.png"
import IncomeSlots from "@/components/IncomeSlots";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";

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

export default function Card() {
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

    const [showVersionInfo, setShowVersionInfo] = useState(false)


    return (
        <div className={'pt-12 w-full min-h-[100svh] flex justify-center items-center'}>
            <Image src={PokemonBackground2} alt="pokemon-background" fill
                   className="absolute object-cover w-full h-full"
                   priority/>
            <div className={'flex flex-col gap-6 px-6 w-full justify-center items-center'}>
                {tabs.map((tab, index) => {
                    const Icon = tab.icon
                    return (
                        <Link href={tab.href} key={index} style={{backgroundColor: colorMap[tab.color]}}
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
            </div>

            <IncomeSlots/>

            <div className={'absolute right-24 bottom-6 cursor-pointer'} onClick={() => setShowVersionInfo(true)}>
                <Info className="h-5 w-5"/>
            </div>

            <Dialog open={showVersionInfo} onOpenChange={setShowVersionInfo}>
                <DialogContent className="max-w-md w-full">
                    <DialogHeader>
                        <DialogTitle
                            className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            <Info className="h-5 w-5 text-blue-600"/>
                            Informacje o aplikacji
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-gray-800 mb-2">v1.0.0-beta</div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-800 border-b pb-2">Najnowsze zmiany</h3>

                            <div className="space-y-3 text-sm">
                                <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                                    <div className="font-medium text-blue-800 mb-1">✨ Nowe funkcje</div>
                                    <ul className="text-blue-700 space-y-1">
                                        <li>• Initial</li>
                                    </ul>
                                </div>

                                <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                                    <div className="font-medium text-green-800 mb-1">🔧 Poprawki</div>
                                    <ul className="text-green-700 space-y-1">
                                        <li>• Initial</li>
                                    </ul>
                                </div>

                                <div className="bg-purple-50 p-3 rounded-lg border-l-4 border-purple-400">
                                    <div className="font-medium text-purple-800 mb-1">🎨 Design</div>
                                    <ul className="text-purple-700 space-y-1">
                                        <li>• Initial</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="text-center pt-4 border-t">
                            <p className="text-xs text-gray-500">Ostatnia aktualizacja: 29 września 2025</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
