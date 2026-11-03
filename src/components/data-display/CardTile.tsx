import Image from "next/image";

type CardTileProps = {
    name: string;
    rarity: string;
    imageSmall: string;
    income: number;
    quantity: number;
    visibleNames?: boolean;
    className?: string;
    isInIndex?: boolean;
};

export default function CardTile({
    name,
    rarity,
    imageSmall,
    income,
    quantity,
    visibleNames,
    className = "",
    isInIndex,
}: CardTileProps) {
    const isOwned = quantity > 0;
    const showName = isOwned || visibleNames;

    return (
        <div className={`rounded-xl flex flex-col justify-center relative group shadow-sm ${className}`}>
            {isOwned ? (
                <div className={`aspect-[245/342] ${isInIndex ? "w-[150px] md:w-[200px]" : ""}`}>
                    <Image src={imageSmall} alt={name} width={245} height={342} unoptimized />
                </div>
            ) : (
                <div
                    className={`aspect-[245/342] ${isInIndex ? "w-[150px] md:w-[200px]" : ""} bg-gray-700 flex items-center justify-center rounded-xl px-2 border-12 border-gray-400 relative`}
                >
                    <span
                        className={`text-gray-400 break-all text-center ${visibleNames ? "text-xl md:text-2xl" : "text-2xl md:text-5xl"}`}
                    >
                        {visibleNames ? name : "???"}
                    </span>
                    <span className={"absolute bottom-6 text-gray-400 text-base md:text-xl text-center capitalize"}>
                        {rarity}
                    </span>
                </div>
            )}
            <div className="absolute w-full bottom-0 left-0 z-10 overflow-hidden rounded-b-md">
                <div className="absolute inset-0 bg-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-b-md">
                    <div className="relative px-3 py-2">
                        <h2 className="text-lg font-semibold">{showName ? name : "???"}</h2>
                        <div className="text-gray-800 -mt-1 capitalize">{rarity}</div>
                    </div>
                </div>
            </div>
            <div
                className={
                    "absolute -top-4 -right-4 bg-white/90 aspect-square p-2 w-12 flex justify-center items-center gap-[1px] rounded-full z-10 shadow-md border-2 border-yellow-300"
                }
            >
                <span className={"font-semibold"}>{income}</span>
                <sub className={"text-muted-foreground text-[9px]"}>/hr</sub>
            </div>
            {quantity > 1 && (
                <div
                    className={
                        "absolute -bottom-2 -left-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full z-20 shadow"
                    }
                >
                    ×{quantity}
                </div>
            )}
        </div>
    );
}
