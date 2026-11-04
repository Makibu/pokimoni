import {cn} from "@/lib/utils";

/** A meter whose value is also shown as text next to it, so the bar itself stays out of the reading order. */
export function ProgressBar({
    value,
    max,
    className,
    trackClassName = "bg-secondary",
}: {
    value: number;
    max: number;
    className?: string;
    trackClassName?: string;
}) {
    const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    return (
        <div aria-hidden="true" className={cn("h-2 overflow-hidden rounded-full", trackClassName, className)}>
            <div className="h-full rounded-full bg-primary transition-[width]" style={{width: `${percent}%`}} />
        </div>
    );
}
