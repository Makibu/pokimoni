import {SetType} from "@/lib/type"
import Link from "next/link";
import Image from "next/image";

export default function SetTile({
                                    id,
                                    name,
                                    total,
                                    series,
                                    images,
                                    totalCollected,
                                    className,
                                }: SetType & { totalCollected?: number, className?: string }) {
    return (
        <div
            className={`w-48 md:w-72 h-72 md:h-[400px] border-2 rounded-xl flex flex-col justify-center p-4 relative group bg-white/60 shadow-sm backdrop-blur-lg ${className}`}>
            <Image src={images!.logo as string} alt={name} width={300} height={300}/>

            <div className="absolute w-full bottom-0 left-0 z-10 overflow-hidden rounded-b-md">
                <div
                    className="absolute inset-0 bg-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-b-md"></div>

                <div className="relative px-3 py-2">
                    <h2 className="text-base md:text-lg font-semibold">{name}</h2>
                    <div className="flex justify-between text-gray-800 -mt-1 text-sm md:text-base">
                        <h3>{series}</h3>
                        <span>{totalCollected}/{total}</span>
                    </div>
                </div>
            </div>

            <div
                className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-0">
                <Link href={`/collection2/${id}`}
                      className="px-4 py-2 bg-white text-black font-semibold rounded-lg shadow hover:bg-gray-200 transition-colors">
                    Zobacz karty
                </Link>
            </div>
        </div>

    )
}