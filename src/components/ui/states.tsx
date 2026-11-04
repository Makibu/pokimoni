import {CircleAlert} from "lucide-react";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";

/** Shown when data could not be loaded and there is nothing cached to display instead. */
export function ErrorState({message, onRetry, className}: {message: string; onRetry?: () => void; className?: string}) {
    return (
        <div
            role="alert"
            className={cn("flex flex-col items-center gap-3 rounded-section bg-peach p-6 text-center", className)}
        >
            <CircleAlert aria-hidden="true" className="size-6" />
            <p className="font-medium">{message}</p>
            {onRetry && (
                <Button variant="ink" onClick={onRetry}>
                    Spróbuj ponownie
                </Button>
            )}
        </div>
    );
}

export function EmptyState({
    title,
    description,
    children,
    className,
}: {
    title: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-col items-center gap-3 rounded-section bg-card p-8 text-center", className)}>
            <p className="font-display font-bold">{title}</p>
            {description && <p className="text-muted-foreground">{description}</p>}
            {children}
        </div>
    );
}
