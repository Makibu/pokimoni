"use client";

import Image from "next/image";
import {useState} from "react";
import {LoadedImage} from "@/components/ui/loaded-image";
import {cn} from "@/lib/utils";

const CARD_WIDTH = 245;
const CARD_HEIGHT = 342;
const LARGE_SCALE = 3;

type CardFaceProps = {
    name: string;
    imageSmall: string;
    imageLarge: string;
    className?: string;
};

/** Shows the small image at once and sharpens to the large one when it arrives; the large one may fail quietly. */
export default function CardFace({name, imageSmall, imageLarge, className}: CardFaceProps) {
    const [largeReady, setLargeReady] = useState(false);

    return (
        <span className={cn("relative block aspect-[245/342] overflow-hidden", className)}>
            <LoadedImage
                src={imageSmall}
                alt={name}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
                eager
                className="size-full"
            />
            <Image
                src={imageLarge}
                alt=""
                width={CARD_WIDTH * LARGE_SCALE}
                height={CARD_HEIGHT * LARGE_SCALE}
                unoptimized
                onLoad={() => setLargeReady(true)}
                className={cn(
                    "absolute inset-0 size-full object-cover transition-opacity duration-200",
                    largeReady ? "opacity-100" : "opacity-0",
                )}
            />
        </span>
    );
}
