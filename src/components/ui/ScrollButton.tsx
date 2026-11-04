"use client";

import {ChevronDown, ChevronUp} from "lucide-react";

const buttonClasses =
    "flex size-11 items-center justify-center rounded-full bg-card shadow-(--lift) transition-colors hover:bg-accent";

export default function ScrollButton() {
    return (
        <div className="fixed right-4 bottom-24 z-30 flex flex-col gap-2 lg:bottom-6">
            <button
                className={buttonClasses}
                aria-label="Przewiń na górę"
                onClick={() => window.scrollTo({top: 0, behavior: "smooth"})}
            >
                <ChevronUp aria-hidden="true" />
            </button>
            <button
                className={buttonClasses}
                aria-label="Przewiń na dół"
                onClick={() => window.scrollTo({top: document.body.scrollHeight, behavior: "smooth"})}
            >
                <ChevronDown aria-hidden="true" />
            </button>
        </div>
    );
}
