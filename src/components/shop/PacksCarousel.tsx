"use client";

import {Button} from "@/components/ui/button";
import {CoinsIcon, Gift} from "lucide-react";
import {useEffect, useRef} from "react";
import Image from "next/image";
import type {PackSource, ShopSet} from "@/server/services/packs";

type PacksCarouselProps = {
    title: string;
    sets: ShopSet[];
    coins: number;
    vouchers: number;
    onOpen: (set: ShopSet, source: PackSource) => void;
};

export default function PacksCarousel({title, sets, coins, vouchers, onOpen}: PacksCarouselProps) {
    const scrollRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) > 0) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        };

        el.addEventListener("wheel", onWheel, {passive: false});
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-xl md:text-3xl font-semibold text-blue-500">{title}</h1>
            <div className="py-[25px] shop-card-border gap-4">
                <div ref={scrollRef} className="flex overflow-x-auto gap-4 custom-scroll">
                    <div className="w-[25px]" />
                    {sets.map((set) => (
                        <div
                            key={set.id}
                            className="w-52 h-52 md:w-72 md:h-72 border-2 shrink-0 rounded-xl p-4 flex flex-col justify-center items-center relative mb-2 overflow-hidden"
                        >
                            <div className={"w-full h-full grid place-items-center pb-2"}>
                                <Image src={set.logo} alt={set.name} width={180} height={180} unoptimized />
                            </div>
                            <h5 className="text-sm text-gray-500 absolute bottom-4 right-4">
                                {set.collected}/{set.total}
                            </h5>
                            <div className="flex flex-col items-center gap-1 ">
                                <h3 className="text-base md:text-lg font-semibold whitespace-nowrap">{set.name}</h3>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="bg-blue-500 hover:bg-blue-600"
                                        disabled={coins < set.price}
                                        onClick={() => onOpen(set, "shop")}
                                    >
                                        {set.price}
                                        <CoinsIcon />
                                    </Button>
                                    {vouchers > 0 && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            aria-label={`Otwórz za darmo: ${set.name}`}
                                            onClick={() => onOpen(set, "voucher")}
                                        >
                                            <Gift />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="w-[25px]" />
                </div>
            </div>
        </div>
    );
}
