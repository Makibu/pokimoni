"use client";

import {useEffect, useState} from "react";

export function useIsMobile(breakpoint = 1280) {
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        const checkIsMobile = () => {
            setIsMobile(window.innerWidth <= breakpoint);
        };

        checkIsMobile();

        window.addEventListener("resize", checkIsMobile);
        return () => window.removeEventListener("resize", checkIsMobile);
    }, [breakpoint]);

    if (!mounted) return null;

    return isMobile;
}
