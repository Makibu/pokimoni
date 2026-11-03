"use client"

import Link from "next/link";
import {BookMarked, BugIcon, ChartNoAxesCombined, Info, LucideIcon, ShoppingBag, Trophy} from "lucide-react";
import PokemonBackground2 from "@public/pokemon-background-2.jpg";
import Image, {StaticImageData} from "next/image";
import React, {useEffect, useState} from "react";

import BannerYellow from "@public/banners/banner-yellow.png"
import BannerRed from "@public/banners/banner-red.png"
import BannerGreen from "@public/banners/banner-green.png"
import BannerBlue from "@public/banners/banner-blue.png"
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import IncomeSlots from "@/components/home/IncomeSlots";

import {changeDate, changesData, version} from "@/lib/changesData";
import {toast} from "sonner";

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

const typeColorMap = {
    Added: ["border-blue-400", "text-blue-800", "text-blue-700", "bg-blue-50"],
    Fixed: ["border-green-400", "text-green-800", "text-green-700", "bg-green-50"],
    Design: ["border-purple-400", "text-purple-800", "text-purple-700", "bg-purple-50"],
} as const;

export default function Card() {
    const tabs: Tab[] = [
        {name: "Sklep", subName: "Kupuj i otwieraj", href: "/shop", icon: ShoppingBag, color: "yellow"},
        {name: "Kolekcja", subName: "Twoja kolekcja", href: "/collection", icon: BookMarked, color: "red"},
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
    const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)

    const [feedbackText, setFeedbackText] = useState("");

    const [uid, setUid] = useState<string | null>(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const storedUid = user.uid;
        if (storedUid) setUid(storedUid);
    }, []);

    async function handleSubmitFeedback() {
        if (!uid || !feedbackText.trim()) return;

        try {
            const res = await fetch("/api/user/feedback", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({uid, description: feedbackText.trim()}),
            });

            if (!res.ok) throw new Error("Nie udało się wysłać feedbacku");

            toast.success("Wiadomość wysłana! Dziękujemy :D")
            setFeedbackText("");
            setShowFeedbackDialog(false);
        } catch {
            toast.error("Coś poszło nie tak, nie udało się wysłać wiadomości ;c")
        }
    }


    return (
        <div
            className={'py-20 lg:pt-12 w-full h-full min-h-[100svh] flex flex-col lg:flex-row xl:flex-col md:justify-center items-center relative'}>
            <Image src={PokemonBackground2} alt="pokemon-background" fill
                   className="absolute object-cover w-full h-full"
                   priority/>
            <div
                className={'flex flex-col gap-2 lg:gap-6 px-6 w-full justify-start md:justify-center items-center'}>
                {tabs.map((tab, index) => {
                    const Icon = tab.icon
                    return (
                        <Link href={tab.href} key={index} style={{backgroundColor: colorMap[tab.color]}}
                              className={'scale-75 md:scale-90 lg:scale-100 h-16 overflow-hidden md:h-20 lg:h-24 w-full max-w-96 border-[1px] border-black/50 rounded-3xl flex justify-center items-center relative backdrop-blur-md bg-opacity-50 shadow-lg transition-transform hover:scale-[0.8] md:hover:scale-95 lg:hover:scale-105'}>
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

            <div className={'fixed right-6 bottom-20 lg:bottom-6 flex gap-2 md:gap-4 flex-col md:flex-row'}>
                <BugIcon className={'w-4 md:w-5 aspect-square cursor-pointer'}
                         onClick={() => setShowFeedbackDialog(true)}/>
                <Info className="aspect-square w-4 md:w-5 cursor-pointer" onClick={() => setShowVersionInfo(true)}/>
            </div>

            <Dialog open={showVersionInfo} onOpenChange={setShowVersionInfo}>
                <DialogContent className="max-w-[95%] md:max-w-md w-full max-h-[90svh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle
                            className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            <Info className="h-5 w-5 text-blue-600"/>
                            Informacje o aplikacji
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-gray-800 mb-2">{version}</div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-800 border-b pb-2">Najnowsze zmiany</h3>

                            <div className="space-y-3 text-sm">
                                {changesData.map((change, index) => {
                                    const classesArr = typeColorMap[change.type] || ["border-gray-300", "text-gray-800", "text-gray-700", "bg-gray-50"];

                                    return (
                                        <div key={index}
                                             className={`${classesArr[0]} ${classesArr[3]} p-3 rounded-lg border-l-4`}>
                                            <div className={`font-medium ${classesArr[1]} mb-1`}>{change.title}</div>
                                            <ul className={`${classesArr[2]} space-y-1`}>
                                                {change.options.map((option, index) => (
                                                    <li key={index}>• {option}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="text-center pt-4 border-t">
                            <p className="text-xs text-gray-500">Ostatnia aktualizacja: {changeDate}</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
                <DialogContent className="max-w-[95%] md:max-w-md w-full">
                    <DialogHeader>
                        <DialogTitle
                            className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                        >
                            <Info className="h-5 w-5 text-blue-600"/>
                            Zgłoś błąd lub pomysł
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-gray-800 border-b pb-2 text-sm">
                                Masz jakiś pomysł na zmiany lub znalazłeś jakiś błąd?<br/>
                                Zgłoś go nam, a my Cię nagrodzimy!
                            </h3>

                            <textarea
                                className="w-full p-2 border rounded-md resize-none"
                                rows={4}
                                placeholder="Opisz swój pomysł lub błąd..."
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                            />

                            <button
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                                onClick={handleSubmitFeedback}
                                disabled={!feedbackText.trim()}
                            >
                                Wyślij
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
