"use client";

import React from "react";
import {ChevronDown, ChevronUp} from "lucide-react";

export default function ScrollButton() {
    const scrollToTop = () => {
        window.scrollTo({top: 0, behavior: "smooth"});
    };

    const scrollToBottom = () => {
        window.scrollTo({top: document.body.scrollHeight, behavior: "smooth"});
    };

    return (
        <div className="fixed right-4 bottom-4 flex flex-col gap-2 z-50">
            <button
                onClick={scrollToTop}
                className="bg-white/50 backdrop-blur-md p-1 rounded-full hover:bg-white transition cursor-pointer flex justify-center items-center shadow-sm"
                aria-label="Scroll to top"
            >
                <ChevronUp />
            </button>
            <button
                onClick={scrollToBottom}
                className="bg-white/50 backdrop-blur-md p-1 rounded-full hover:bg-white transition cursor-pointer flex justify-center items-center shadow-sm"
                aria-label="Scroll to bottom"
            >
                <ChevronDown />
            </button>
        </div>
    );
}
