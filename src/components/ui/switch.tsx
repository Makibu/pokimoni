"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import {cn} from "@/lib/utils";

function Switch({className, ...props}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
    return (
        <SwitchPrimitive.Root
            data-slot="switch"
            className={cn(
                "peer relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-input transition-colors disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:bg-secondary",
                // Keeps the touch target at 44 px without making the control itself bigger.
                "before:absolute before:-inset-y-2 before:inset-x-0 before:content-['']",
                className,
            )}
            {...props}
        >
            <SwitchPrimitive.Thumb
                data-slot="switch-thumb"
                className="pointer-events-none block size-5 translate-x-1 rounded-full bg-ink transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-primary-foreground"
            />
        </SwitchPrimitive.Root>
    );
}

export {Switch};
