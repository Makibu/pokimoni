"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import {cn} from "@/lib/utils";

function Tabs({className, ...props}: React.ComponentProps<typeof TabsPrimitive.Root>) {
    return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props} />;
}

function TabsList({className, ...props}: React.ComponentProps<typeof TabsPrimitive.List>) {
    return (
        <TabsPrimitive.List
            data-slot="tabs-list"
            className={cn(
                "inline-flex h-12 w-fit items-center justify-center rounded-full bg-secondary p-1",
                className,
            )}
            {...props}
        />
    );
}

function TabsTrigger({className, ...props}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
    return (
        <TabsPrimitive.Trigger
            data-slot="tabs-trigger"
            className={cn(
                "inline-flex h-full flex-1 items-center justify-center rounded-full px-4 text-sm font-bold whitespace-nowrap text-muted-foreground transition-colors disabled:pointer-events-none disabled:opacity-60 data-[state=active]:bg-card data-[state=active]:text-foreground",
                className,
            )}
            {...props}
        />
    );
}

function TabsContent({className, ...props}: React.ComponentProps<typeof TabsPrimitive.Content>) {
    return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1", className)} {...props} />;
}

export {Tabs, TabsList, TabsTrigger, TabsContent};
