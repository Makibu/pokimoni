"use client"

import TabHeader from "@/components/layout/TabHeader";
import Minigames from "@/components/shop/Minigames";
import {CoinsIcon, GalleryHorizontalEnd} from "lucide-react";
import {Button} from "@/components/ui/button";
import PacksCarousel from "@/components/shop/PacksCarousel";
import {useUserCoins} from "@/hooks/queries/useUserCoins";
import {toast} from "sonner";
import {useUserStats} from "@/hooks/queries/useUserStats";
import {useDailyPack} from "@/hooks/queries/useDailyPack";
import {useState} from "react";
import {SetType} from "@/lib/types";
import OpenPackDialog from "@/components/shop/OpenPackDialog";

export default function ShopPage() {
    const {dailyAvailable, updateCoins} = useUserCoins()
    const {data: userStats, isLoading: statsLoading} = useUserStats()
    const {data: dailyPack, isLoading: dailyPackLoading} = useDailyPack();
    const [open, setOpen] = useState(false);
    const [selectedSetData, setSelectedSetData] = useState<SetType | null>(null);

    async function handleOpenPack(set: SetType) {
        setSelectedSetData(set)
        setOpen(true)
    }

    async function handleDailyCoins() {
        try {
            await updateCoins({type: "daily", amount: 300})
            toast.success("Odebrano 300 coinsów")
        } catch {
            toast.error("Coś poszło nie tak ;( Spróbuj ponownie później.")
        }
    }

    if (statsLoading || dailyPackLoading || !dailyPack || !userStats) return null

    function getDailyPackPrice(packClass: number | undefined) {
        if (!packClass) return 0;

        switch (packClass) {
            case 1:
                return packClass * 100 - 25;
            case 2:
                return packClass * 100 - 75;
            case 3:
                return packClass * 100 - 100;
            default:
                return packClass * 100;
        }
    }

    const dailyPackPrice = getDailyPackPrice(dailyPack.set?.class);

    return (
        <div className={'overflow-x-hidden pb-32 bg-gradient-to-br from-white via-blue-50/30 to-slate-50'}>
            <TabHeader title={"Sklep"}
                       description={"Kupuj nowe paczki lub zdobywaj nagrody grając w minigry!"}/>
            <div className={'px-6 md:px-12 lg:px-32 xl:px-48 2xl:px-96'}>
                <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-4 md:grid-rows-2 gap-5 mt-12">
                    <Minigames
                        className="md:col-span-2 md:row-span-1 h-72 shop-card-border"/>
                    <div
                        className="md:row-span-2 md:col-span-1 shop-card-border flex flex-col justify-center items-center px-20 md:px-2 lg:px-6 relative py-4 md:py-6">
                        <h1 className={'text-2xl font-semibold'}>{dailyPack.set.name}</h1>
                        <div className={'w-full h-full pb-2 grid place-items-center'}>
                            <img src={dailyPack.set.images.logo} alt={dailyPack.set.name}/>
                        </div>
                        <div className={'flex flex-col items-center gap-2'}>
                            <h3 className={'text-xl font-semibold'}>Kup na przecenie!</h3>
                            <Button className={"bg-blue-500 hover:bg-blue-600"} size={"sm"}
                                    disabled={userStats.coins < dailyPackPrice}
                                    onClick={() => handleOpenPack(dailyPack.set)}><span
                                className={'line-through text-gray-200'}>{dailyPack.set.class * 100}</span><span
                                className={'font-semibold'}>{dailyPackPrice}</span>
                                <CoinsIcon/></Button>
                        </div>
                    </div>
                    <div className={'flex flex-col shop-card-border items-center justify-center px-2'}>
                        <div className={'w-16 h-16 bg-blue-500 p-3 rounded-full'}>
                            <CoinsIcon className={'text-white w-full h-full'}/>
                        </div>
                        <h1 className={'text-lg font-semibold mt-3'}>Codzienne monety!</h1>
                        <h4 className={'text-gray-500 text-sm text-center'}>Odbierz darmowe monety każdego dnia</h4>
                        <Button className={'bg-blue-500 hover:bg-blue-600 mt-6'} onClick={handleDailyCoins}
                                disabled={!dailyAvailable}>{dailyAvailable ? "Odbierz 300 monet" : "Odebrano!"}</Button>
                    </div>
                    <div className={'flex flex-col shop-card-border items-center justify-center px-2'}>
                        <div className={'w-16 h-16 bg-blue-500 p-3 rounded-full'}>
                            <GalleryHorizontalEnd className={'text-white w-full h-full'}/>
                        </div>
                        <h1 className={'text-lg font-semibold mt-3'}>Twoje karty!</h1>
                        <h4 className={'text-gray-500 text-sm text-center'}>Czy dasz radę zdobyć je wszystkie?</h4>
                        <span
                            className={'text-blue-500 font-semibold text-xl mt-4'}>{userStats.total_unique_cards}/{userStats.cardsTotal}</span>
                    </div>
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

            <OpenPackDialog open={open} set={selectedSetData} price={dailyPackPrice} setOpen={setOpen}
                            setSelectedSetData={setSelectedSetData}/>
        </div>
    )
}