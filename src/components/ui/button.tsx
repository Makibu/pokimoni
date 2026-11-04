import * as React from "react";
import {Slot} from "@radix-ui/react-slot";
import {cva, type VariantProps} from "class-variance-authority";

import {cn} from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-colors disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/90",
                ink: "bg-ink text-ink-foreground hover:bg-ink/85",
                destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                outline: "border border-input bg-card text-foreground hover:bg-accent",
                secondary: "bg-secondary text-foreground hover:bg-accent",
                ghost: "text-foreground hover:bg-accent",
                link: "text-accent-ink underline-offset-4 hover:underline",
            },
            size: {
                default: "h-11 px-5",
                sm: "h-11 px-4",
                lg: "h-12 px-6 text-[15px]",
                icon: "size-11",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    }) {
    const Comp = asChild ? Slot : "button";

    return <Comp data-slot="button" className={cn(buttonVariants({variant, size, className}))} {...props} />;
}

export {Button, buttonVariants};
