import {cn} from "@/lib/utils";

/** A placeholder shape shown in place of content that is still loading. */
export function Skeleton({className}: {className?: string}) {
    return <div aria-hidden="true" className={cn("skeleton rounded-md", className)} />;
}

/** Announces the loading state once for a whole group of placeholders. */
export function LoadingRegion({className, children}: {className?: string; children: React.ReactNode}) {
    return (
        <div role="status" aria-busy="true" className={className}>
            <span className="sr-only">Ładowanie...</span>
            {children}
        </div>
    );
}
