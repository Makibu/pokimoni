"use client";

import {CoinsIcon, GalleryHorizontalEnd} from "lucide-react";
import Image from "next/image";
import {useState} from "react";
import {toast} from "sonner";
import TabHeader from "@/components/layout/TabHeader";
import OpenPackDialog, {type PackToOpen} from "@/components/shop/OpenPackDialog";
import PacksCarousel from "@/components/shop/PacksCarousel";
import {Button} from "@/components/ui/button";
import type {PackTier} from "@/domain/economy";
import {useClaimDaily, usePlayer, useShop} from "@/features/game/use-game";
import type {PackSource, ShopSet} from "@/server/services/packs";

const TIERS: PackTier[] = [1, 2, 3];

export default function ShopPage() {
    const {data: shop, error} = useShop();
    const {data: player} = usePlayer();
    const claimDaily = useClaimDaily();
    const [packToOpen, setPackToOpen] = useState<PackToOpen | null>(null);

    function openFromCarousel(set: ShopSet, source: PackSource) {
        setPackToOpen({setId: set.id, name: set.name, logo: set.logo, price: set.price, source});
    }

    function handleClaimDaily() {
        claimDaily.mutate(undefined, {
            onSuccess: ({reward, streakDay}) => toast.success(`Odebrano ${reward} monet! Seria: dzień ${streakDay}`),
            onError: (claimError) => toast.error(claimError.message),
        });
    }

    if (error) return <p>Błąd: {error.message}</p>;
    if (!shop || !player) return null;

    const {dailyPack} = shop;

    return (
        <div className={"overflow-x-hidden pb-32 bg-gradient-to-br from-white via-blue-50/30 to-slate-50"}>
            <TabHeader title={"Sklep"} description={"Kupuj nowe paczki i wypełniaj swój indeks kart!"} />
            <div className={"px-6 md:px-12 lg:px-32 xl:px-48 2xl:px-96"}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
                    <div className="shop-card-border flex flex-col justify-center items-center px-6 relative py-4 md:py-6 text-center">
                        <h1 className={"text-2xl font-semibold"}>{dailyPack.name}</h1>
                        <div className={"w-full h-full pb-2 grid place-items-center"}>
                            <Image src={dailyPack.logo} alt={dailyPack.name} width={240} height={120} unoptimized />
                        </div>
                        <div className={"flex flex-col items-center gap-2"}>
                            <h3 className={"text-xl font-semibold"}>Paczka dnia na przecenie!</h3>
                            <Button
                                className={"bg-blue-500 hover:bg-blue-600"}
                                size={"sm"}
                                disabled={player.coins < dailyPack.price}
                                onClick={() =>
                                    setPackToOpen({
                                        setId: dailyPack.id,
                                        name: dailyPack.name,
                                        logo: dailyPack.logo,
                                        price: dailyPack.price,
                                        source: "daily_pack",
                                    })
                                }
                            >
                                <span className={"line-through text-gray-200"}>{dailyPack.regularPrice}</span>
                                <span className={"font-semibold"}>{dailyPack.price}</span>
                                <CoinsIcon />
                            </Button>
                        </div>
                    </div>
                    <div className={"flex flex-col shop-card-border items-center justify-center px-2 py-6"}>
                        <div className={"w-16 h-16 bg-blue-500 p-3 rounded-full"}>
                            <CoinsIcon className={"text-white w-full h-full"} />
                        </div>
                        <h1 className={"text-lg font-semibold mt-3"}>Codzienna nagroda</h1>
                        <h4 className={"text-gray-500 text-sm text-center"}>
                            Seria: dzień {player.daily.streakDay} z 7
                        </h4>
                        <Button
                            className={"bg-blue-500 hover:bg-blue-600 mt-6"}
                            onClick={handleClaimDaily}
                            disabled={!player.daily.claimable || claimDaily.isPending}
                        >
                            {player.daily.claimable ? `Odbierz ${player.daily.reward} monet` : "Odebrano!"}
                        </Button>
                    </div>
                    <div className={"flex flex-col shop-card-border items-center justify-center px-2 py-6"}>
                        <div className={"w-16 h-16 bg-blue-500 p-3 rounded-full"}>
                            <GalleryHorizontalEnd className={"text-white w-full h-full"} />
                        </div>
                        <h1 className={"text-lg font-semibold mt-3"}>Twoje karty!</h1>
                        <h4 className={"text-gray-500 text-sm text-center"}>Czy dasz radę zdobyć je wszystkie?</h4>
                        <span className={"text-blue-500 font-semibold text-xl mt-4"}>
                            {shop.uniqueCards}/{shop.catalogCards}
                        </span>
                    </div>
                </div>
                {TIERS.map((tier) => {
                    const sets = shop.sets.filter((set) => set.tier === tier);
                    return (
                        <div className={"mt-12"} key={tier}>
                            <PacksCarousel
                                title={`Paczki po ${sets[0]?.price ?? ""} monet:`}
                                sets={sets}
                                coins={player.coins}
                                vouchers={shop.vouchers[tier]}
                                onOpen={openFromCarousel}
                            />
                        </div>
                    );
                })}
            </div>

            <OpenPackDialog pack={packToOpen} onClose={() => setPackToOpen(null)} />
        </div>
    );
}
