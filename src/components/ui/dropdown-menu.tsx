"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import {CheckIcon} from "lucide-react";

import {cn} from "@/lib/utils";

const itemClasses =
    "relative flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-medium outline-hidden select-none focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

function DropdownMenu({...props}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
    return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger({...props}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
    return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
    className,
    sideOffset = 8,
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
    return (
        <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
                data-slot="dropdown-menu-content"
                sideOffset={sideOffset}
                className={cn(
                    "z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-44 origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-xl bg-popover p-2 text-popover-foreground shadow-(--lift) data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                    className,
                )}
                {...props}
            />
        </DropdownMenuPrimitive.Portal>
    );
}

function DropdownMenuItem({
    className,
    variant = "default",
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
    variant?: "default" | "destructive";
}) {
    return (
        <DropdownMenuPrimitive.Item
            data-slot="dropdown-menu-item"
            data-variant={variant}
            className={cn(itemClasses, "data-[variant=destructive]:text-destructive", className)}
            {...props}
        />
    );
}

function DropdownMenuCheckboxItem({
    className,
    children,
    checked,
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
    return (
        <DropdownMenuPrimitive.CheckboxItem
            data-slot="dropdown-menu-checkbox-item"
            className={cn(itemClasses, "pl-10", className)}
            checked={checked}
            {...props}
        >
            <span className="absolute left-3 flex size-5 items-center justify-center rounded-sm border border-input">
                <DropdownMenuPrimitive.ItemIndicator>
                    <CheckIcon className="size-4 text-accent-ink" />
                </DropdownMenuPrimitive.ItemIndicator>
            </span>
            {children}
        </DropdownMenuPrimitive.CheckboxItem>
    );
}

function DropdownMenuRadioGroup({...props}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
    return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
    className,
    children,
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
    return (
        <DropdownMenuPrimitive.RadioItem
            data-slot="dropdown-menu-radio-item"
            className={cn(itemClasses, "pl-10", className)}
            {...props}
        >
            <span className="absolute left-3 flex size-5 items-center justify-center rounded-full border border-input">
                <DropdownMenuPrimitive.ItemIndicator>
                    <span className="block size-2.5 rounded-full bg-primary" />
                </DropdownMenuPrimitive.ItemIndicator>
            </span>
            {children}
        </DropdownMenuPrimitive.RadioItem>
    );
}

function DropdownMenuLabel({className, ...props}: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
    return (
        <DropdownMenuPrimitive.Label
            data-slot="dropdown-menu-label"
            className={cn("px-3 py-2 text-sm font-bold", className)}
            {...props}
        />
    );
}

function DropdownMenuSeparator({className, ...props}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
    return (
        <DropdownMenuPrimitive.Separator
            data-slot="dropdown-menu-separator"
            className={cn("mx-1 my-2 h-px bg-border", className)}
            {...props}
        />
    );
}

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
};
