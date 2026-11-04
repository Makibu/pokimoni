import * as React from "react";

import {cn} from "@/lib/utils";

const fieldClasses =
    "w-full min-w-0 rounded-lg border border-input bg-card px-4 text-base text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground disabled:pointer-events-none disabled:opacity-60 aria-invalid:border-destructive";

function Input({className, type, ...props}: React.ComponentProps<"input">) {
    return <input type={type} data-slot="input" className={cn(fieldClasses, "flex h-11", className)} {...props} />;
}

function Textarea({className, ...props}: React.ComponentProps<"textarea">) {
    return <textarea data-slot="textarea" className={cn(fieldClasses, "resize-none py-3", className)} {...props} />;
}

export {Input, Textarea};
