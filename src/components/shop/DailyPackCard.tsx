"use client";

import {Coins} from "lucide-react";
import dynamic from "next/dynamic";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {LoadedImage} from "@/components/ui/loaded-image";
import {LoadingRegion, Skeleton} from "@/components/ui/skeleton";
import {ErrorState} from "@/components/ui/states";
import {DAILY_PACK_DISCOUNT} from "@/domain/economy";
import {usePlayer, useShop} from "@/features/game/use-game";
import {cn} from "@/lib/utils";

const OpenPackDialog = dynamic(() => import("@/components/shop/OpenPackDialog"));

const FRAME = "flex items-center gap-4 rounded-section bg-aqua p-4 md:gap-5 md:p-6";
const PACK = "h-[122px] w-[88px] shrink-0 rotate-[5deg] rounded-[14px]";

export function DailyPackSkeleton({className}: {className?: string}) {
    return (
        <LoadingRegion className={cn(FRAME, className)}>
            <Skeleton className={PACK} />
            <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-6 w-4/5 rounded-full" />
                <Skeleton className="h-4 w-1/2 rounded-full" />
                <Skeleton className="h-11 w-32 rounded-full" />
            </div>
        </LoadingRegion>
    );
}

export default function DailyPackCard({className}: {className?: string}) {
    const {data: shop, error, refetch} = useShop();
    const {data: player} = usePlayer();
    const [open, setOpen] = useState(false);

    if (!shop) {
        if (error) return <ErrorState className={className} message={error.message} onRetry={() => void refetch()} />;
        return <DailyPackSkeleton className={className} />;
    }

    const {dailyPack} = shop;

    return (
        <section aria-label="Paczka dnia" className={cn(FRAME, className)}>
            <div className={cn("holo-rim p-1", PACK)}>
                <div className="flex size-full items-center justify-center rounded-[10px] bg-white p-1.5">
                    <LoadedImage
                        key={dailyPack.logo}
                        src={dailyPack.logo}
                        alt={dailyPack.name}
                        width={160}
                        height={80}
                        fit="contain"
                        eager
                        className="h-16 w-full rounded-sm"
                    />
                </div>
            </div>
            <div className="flex min-w-0 flex-col items-start gap-1.5">
                <h2 className="font-display text-base leading-tight font-bold md:text-xl">
                    Paczka dnia −{Math.round(DAILY_PACK_DISCOUNT * 100)}%
                </h2>
                <p className="text-sm font-medium">{dailyPack.name}. Zmienia się o 10:00</p>
                <Button
                    variant="ink"
                    className="mt-1"
                    disabled={!player || player.coins < dailyPack.price}
                    onClick={() => setOpen(true)}
                >
                    <span className="sr-only">Kup paczkę dnia</span>
                    <span aria-hidden="true">Kup za</span> {dailyPack.price}
                    <Coins aria-hidden="true" />
                    <s className="font-medium opacity-80">
                        <span className="sr-only">cena regularna</span>
                        {dailyPack.regularPrice}
                    </s>
                </Button>
            </div>
            {open && (
                <OpenPackDialog
                    pack={{
                        setId: dailyPack.id,
                        name: dailyPack.name,
                        logo: dailyPack.logo,
                        price: dailyPack.price,
                        source: "daily_pack",
                    }}
                    onClose={() => setOpen(false)}
                />
            )}
        </section>
    );
}
