"use client";

import {useSyncExternalStore} from "react";

function subscribe(listener: () => void) {
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
}

/** Whether the viewport is at most `breakpoint` wide; `null` while rendering on the server. */
export function useIsMobile(breakpoint = 1280): boolean | null {
    return useSyncExternalStore(
        subscribe,
        () => window.innerWidth <= breakpoint,
        () => null,
    );
}
