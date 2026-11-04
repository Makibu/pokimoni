/** Delays that only exist to let an animation play disappear for people who asked for less motion. */
export function motionMs(ms: number): number {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
}
