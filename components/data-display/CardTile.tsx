import {Card} from "@/lib/type"
import Image from "next/image";

export default function CardTile({
                                     name,
                                     rarity,
                                     images,
                                     isOwned,
                                     visibleNames,
                                     income,
                                     className
                                 }: Card & { isOwned?: boolean, visibleNames?: boolean, className?: string }) {
    return (
        <div
            className={`rounded-xl flex flex-col justify-center relative group shadow-sm ${className}`}>
            {isOwned ? (
                <div className={'w-[150px] md:w-[300px] aspect-[300/418]'}>
                    <Image src={images!.large as string} alt={name || "card"} width={300} height={300}/>
                </div>
            ) : (
                <div
                    className={'w-[150px] md:w-[300px] aspect-[300/418] bg-gray-700 flex items-center justify-center rounded-xl border-12 border-gray-400 relative'}>
                    <span
                        className={`text-gray-400 text-center ${visibleNames ? "text-xl md:text-3xl" : "text-2xl md:text-5xl"}`}>{visibleNames ? name : "???"}</span>
                    <span className={'absolute bottom-6 text-gray-400 text-base md:text-xl text-center'}>{rarity}</span>
                </div>
            )}
            <div className="absolute w-full bottom-0 left-0 z-10 overflow-hidden rounded-b-md">
                <div
                    className="absolute inset-0 bg-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-b-md">
                    <div className="relative px-3 py-2">
                        <h2 className="text-lg font-semibold">{name}</h2>
                        <div className="flex justify-between text-gray-800 -mt-1">
                            <h3>{name}</h3>
                            <span>{rarity}</span>
                        </div>
                    </div>
                </div>
            </div>
            {income && (
                <div
                    className={'absolute -top-4 -right-4 bg-white/90 aspect-square p-2 w-12 flex justify-center items-center gap-[1px] rounded-full z-10 shadow-md border-2 border-yellow-300'}>
                    <span className={'font-semibold'}>{income}</span>
                    <sub className={'text-muted-foreground text-[9px]'}>/hr</sub>
                </div>
            )}
        </div>
    )
}