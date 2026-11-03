"use client";

import {useQuery} from "@tanstack/react-query";
import {SetType} from "@/lib/types";
import {Button} from "@/components/ui/button";
import {CoinsIcon} from "lucide-react";
import {useUserTotalPerSet} from "@/hooks/queries/useUserTotalPerSet";
import {useEffect, useRef, useState} from "react";
import {useUserCoins} from "@/hooks/queries/useUserCoins";
import OpenPackDialog from "@/components/shop/OpenPackDialog";
import Image from "next/image";

export default function PacksCarousel({price}: {price: number}) {
    const {coins} = useUserCoins();
    const [open, setOpen] = useState(false);
    const [selectedSetData, setSelectedSetData] = useState<SetType | null>(null);

    const {data: setList} = useQuery({
        queryKey: ["sets"],
        queryFn: async () => {
            const res = await fetch("/api/sets");
            if (!res.ok) throw new Error("Nie udało się pobrać setów");
            return res.json();
        },
    });

    const {data: userTotalPerSet} = useUserTotalPerSet();
    const sets: SetType[] = setList?.data || [];

    const filteredSets = sets.filter((set) => {
        if (price === 100) return set.class === 1;
        if (price === 200) return set.class === 2;
        if (price === 300) return set.class === 3;
        return false;
    });

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

    async function handleOpenPack(set: SetType) {
        setSelectedSetData(set);
        setOpen(true);
    }

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-xl md:text-3xl font-semibold text-blue-500">Paczki po {price} monet:</h1>
            <div className="py-[25px] shop-card-border gap-4">
                <div ref={scrollRef} className="flex overflow-x-auto gap-4 custom-scroll">
                    <div className="w-[25px]" />
                    {filteredSets.map((set: SetType, index: number) => (
                        <div
                            key={index}
                            className="w-52 h-52 md:w-72 md:h-72 border-2 shrink-0 rounded-xl p-4 flex flex-col justify-center items-center relative mb-2 overflow-hidden"
                        >
                            <div className={"w-full h-full grid place-items-center pb-2"}>
                                <Image src={set.images!.logo as string} alt={set.name} width={180} height={180} />
                            </div>
                            <h5 className="text-sm text-gray-500 absolute bottom-4 right-4">
                                {userTotalPerSet?.[set.id] ?? 0}/{set.total}
                            </h5>
                            <div className="flex flex-col items-center gap-1 ">
                                <h3 className="text-base md:text-lg font-semibold whitespace-nowrap">{set.name}</h3>
                                <Button
                                    size="sm"
                                    className="bg-blue-500 hover:bg-blue-600"
                                    disabled={coins < price}
                                    onClick={() => handleOpenPack(set)}
                                >
                                    {price}
                                    <CoinsIcon />
                                </Button>
                            </div>
                        </div>
                    ))}
                    <div className="w-[25px]" />
                </div>
            </div>

            <OpenPackDialog
                open={open}
                set={selectedSetData}
                price={price}
                setOpen={setOpen}
                setSelectedSetData={setSelectedSetData}
            />
        </div>
    );
}
