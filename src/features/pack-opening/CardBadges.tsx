import {cn} from "@/lib/utils";

/** Fixed colours: these sit on card art, which looks the same in both themes. */
export default function CardBadges({
    isNew,
    overLimit,
    className,
}: {
    isNew: boolean;
    overLimit: boolean;
    className?: string;
}) {
    if (!isNew && !overLimit) return null;
    return (
        <span
            className={cn(
                "rounded-full px-2 py-0.5 text-xs font-bold text-white ring-1 ring-white/50",
                overLimit ? "bg-[#221b4b]" : "bg-[#0b6b4a]",
                className,
            )}
        >
            {overLimit ? "LIMIT" : "NOWA"}
        </span>
    );
}
