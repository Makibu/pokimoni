"use client";

import {Gift} from "lucide-react";
import dynamic from "next/dynamic";
import {useState} from "react";
import PageHeader from "@/components/layout/PageHeader";
import DailyPackCard from "@/components/shop/DailyPackCard";
import DailyRewardCard from "@/components/shop/DailyRewardCard";
import PackTile from "@/components/shop/PackTile";
import ShopSkeleton from "@/components/shop/ShopSkeleton";
import {ProgressBar} from "@/components/ui/progress-bar";
import {ErrorState} from "@/components/ui/states";
import {PACK_PRICES, type PackTier} from "@/domain/economy";
import {usePlayer, useShop} from "@/features/game/use-game";
import type {PackToOpen} from "@/features/pack-opening/flow";
import {formatNumber} from "@/lib/format";
import type {PackSource, ShopSet} from "@/server/services/packs";

const PackOpeningDialog = dynamic(() => import("@/features/pack-opening/PackOpeningDialog"), {ssr: false});

const TIERS: PackTier[] = [1, 2, 3];

export default function ShopPage() {
    const {data: shop, error, refetch} = useShop();
    const {data: player} = usePlayer();
    const [packToOpen, setPackToOpen] = useState<PackToOpen | null>(null);

    function openFromTile(set: ShopSet, source: PackSource) {
        setPackToOpen({setId: set.id, name: set.name, logo: set.logo, price: set.price, source});
    }

    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            <PageHeader title="Sklep" description="Kupuj nowe paczki i wypełniaj swój indeks kart!" />

            {!shop ? (
                error ? (
                    <ErrorState message={error.message} onRetry={() => void refetch()} />
                ) : (
                    <ShopSkeleton />
                )
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <DailyPackCard />
                        <DailyRewardCard />
                        <section
                            aria-label="Twoje karty"
                            className="flex flex-col justify-center gap-2 rounded-section bg-sun p-4 md:col-span-2 md:p-6 lg:col-span-1"
                        >
                            <h2 className="font-display text-lg font-bold md:text-xl">Twoje karty</h2>
                            <p className="text-sm font-medium">Czy dasz radę zdobyć je wszystkie?</p>
                            <p className="font-display font-bold tabular-nums">
                                {formatNumber(shop.uniqueCards)} z {formatNumber(shop.catalogCards)}
                            </p>
                            <ProgressBar
                                value={shop.uniqueCards}
                                max={shop.catalogCards}
                                trackClassName="bg-streak-empty"
                            />
                        </section>
                    </div>

                    {TIERS.map((tier) => (
                        <section key={tier} className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                                <h2 className="font-display text-base font-bold md:text-lg">
                                    Paczki po {PACK_PRICES[tier]} monet
                                </h2>
                                {shop.vouchers[tier] > 0 && (
                                    <p className="flex items-center gap-1.5 rounded-full bg-pink px-3 py-1 text-sm font-semibold">
                                        <Gift aria-hidden="true" className="size-4" />
                                        Darmowe paczki: {shop.vouchers[tier]}
                                    </p>
                                )}
                            </div>
                            <ul
                                tabIndex={0}
                                aria-label={`Paczki po ${PACK_PRICES[tier]} monet`}
                                className="-mx-4 flex snap-x scroll-pl-4 gap-3 overflow-x-auto px-4 pt-0.5 pb-2 md:mx-0 md:scroll-pl-0 md:px-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0"
                            >
                                {shop.sets
                                    .filter((set) => set.tier === tier)
                                    .map((set) => (
                                        <PackTile
                                            key={set.id}
                                            set={set}
                                            coins={player?.coins ?? 0}
                                            vouchers={shop.vouchers[tier]}
                                            onOpen={openFromTile}
                                        />
                                    ))}
                            </ul>
                        </section>
                    ))}
                </>
            )}

            {packToOpen && <PackOpeningDialog pack={packToOpen} onClose={() => setPackToOpen(null)} />}
        </div>
    );
}
