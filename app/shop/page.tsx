"use client"

import TabHeader from "@/components/layout/TabHeader";
import Minigames from "@/components/shop/Minigames";
import {CoinsIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import PacksCarousel from "@/components/shop/PacksCarousel";
import {useUserCoins} from "@/hooks/queries/useUserCoins";
import {toast} from "sonner";

export default function ShopPage() {
    const {dailyAvailable, updateCoins} = useUserCoins()

    async function handleDailyCoins() {
        try {
            await updateCoins({type: "daily", amount: 300})
            toast.success("Odebrano 300 coinsów")
        } catch {
            toast.error("Coś poszło nie tak ;( Spróbuj ponownie później.")
        }
    }

    return (
        <div className={'overflow-x-hidden pb-32 bg-gradient-to-br from-white via-blue-50/30 to-slate-50'}>
            <TabHeader title={"Sklep"}
                       description={"Kupuj nowe paczki lub zdobywaj nagrody grając w minigry!"}/>
            <div className={'px-6 md:px-12 lg:px-32 xl:px-48 2xl:px-96'}>
                <div className="grid grid-cols-2 lg:grid-cols-3 grid-rows-3 lg:grid-rows-2 gap-5 mt-12">
                    <Minigames
                        className="col-span-2 row-span-1 h-72 shop-card-border"/>
                    <div className="row-span-2 bg-purple-300">div2</div>
                    <div className={'flex flex-col shop-card-border items-center justify-center'}>
                        <div className={'w-16 h-16 bg-blue-500 p-3 rounded-full'}>
                            <CoinsIcon className={'text-white w-full h-full'}/>
                        </div>
                        <h1 className={'text-lg font-semibold mt-3'}>Codzienne coinsy!</h1>
                        <h4 className={'text-gray-500 text-sm'}>Odbierz darmowe monety każdego dnia</h4>
                        <Button className={'bg-blue-500 hover:bg-blue-600 mt-6'} onClick={handleDailyCoins}
                                disabled={!dailyAvailable}>{dailyAvailable ? "Odbierz 300 monet" : "Odebrano!"}</Button>
                    </div>
                    <div className="bg-yellow-300">div4</div>
                </div>
                <div className={'mt-12'}>
                    <PacksCarousel price={100}/>
                </div>
                <div className={'mt-12'}>
                    <PacksCarousel price={200}/>
                </div>
                <div className={'mt-12'}>
                    <PacksCarousel price={300}/>
                </div>
            </div>
        </div>
    )
}