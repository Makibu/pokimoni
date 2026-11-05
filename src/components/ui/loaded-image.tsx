"use client";

import Image from "next/image";
import {useState} from "react";
import {cn} from "@/lib/utils";

type LoadedImageProps = {
    src: string;
    alt: string;
    width: number;
    height: number;
    /** Set logos have transparent margins and must not be cropped. */
    fit?: "cover" | "contain";
    eager?: boolean;
    className?: string;
    /** Replaces the fallback with the name, for callers that show their own way out. */
    onError?: () => void;
};

/**
 * Catalog images come straight from the external host: Vercel's optimizer has a monthly limit that
 * thousands of card images would exhaust. The box keeps its size and shows a placeholder until the image
 * arrives, so nothing jumps, and falls back to the image's name when the host does not answer.
 */
export function LoadedImage({src, alt, width, height, fit = "cover", eager, className, onError}: LoadedImageProps) {
    const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");

    return (
        <span className={cn("relative block overflow-hidden", status === "loading" && "skeleton", className)}>
            {status === "failed" ? (
                <span className="absolute inset-0 flex items-center justify-center bg-secondary p-2 text-center text-xs font-medium text-muted-foreground">
                    {alt}
                </span>
            ) : (
                <Image
                    src={src}
                    alt={alt}
                    width={width}
                    height={height}
                    unoptimized
                    loading={eager ? "eager" : "lazy"}
                    onLoad={() => setStatus("loaded")}
                    onError={() => {
                        setStatus("failed");
                        onError?.();
                    }}
                    className={cn(
                        "size-full transition-opacity duration-200",
                        fit === "cover" ? "object-cover" : "object-contain",
                        status === "loaded" ? "opacity-100" : "opacity-0",
                    )}
                />
            )}
        </span>
    );
}
