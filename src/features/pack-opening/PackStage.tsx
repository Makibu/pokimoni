"use client";

import {useRef, useState} from "react";
import {LoadedImage} from "@/components/ui/loaded-image";
import type {PackToOpen} from "@/features/pack-opening/flow";

/** Movement below this is a click, not a cut. */
const CLICK_SLOP_PX = 8;
/** A cut completes after dragging this share of the pack's width. */
const CUT_LENGTH = 0.7;

function useCutGesture(enabled: boolean, onCut: () => void) {
    const [cut, setCut] = useState({progress: 0, fromLeft: true});
    const drag = useRef<{startX: number; width: number} | null>(null);
    const dragged = useRef(false);

    return {
        cut,
        handlers: {
            // A drag that starts on the logo must not turn into the browser's own image drag.
            onDragStart(event: React.DragEvent<HTMLButtonElement>) {
                event.preventDefault();
            },
            onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
                if (!enabled) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                drag.current = {startX: event.clientX, width: event.currentTarget.offsetWidth};
                dragged.current = false;
            },
            onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
                if (!drag.current) return;
                const distance = event.clientX - drag.current.startX;
                if (Math.abs(distance) > CLICK_SLOP_PX) dragged.current = true;
                const progress = Math.min(Math.abs(distance) / (drag.current.width * CUT_LENGTH), 1);
                setCut({progress, fromLeft: distance >= 0});
                if (progress === 1) {
                    drag.current = null;
                    onCut();
                }
            },
            onPointerUp() {
                drag.current = null;
                setCut((current) => ({...current, progress: 0}));
            },
            onPointerCancel() {
                drag.current = null;
                setCut((current) => ({...current, progress: 0}));
            },
            // Also covers Enter and Space. The click that ends a drag must not count as a second action.
            onClick() {
                if (enabled && !dragged.current) onCut();
                dragged.current = false;
            },
        },
    };
}

export default function PackStage({
    pack,
    state,
    onCut,
    buttonRef,
}: {
    pack: PackToOpen;
    state: "offer" | "sealed" | "torn";
    onCut: () => void;
    buttonRef?: React.Ref<HTMLButtonElement>;
}) {
    const {cut, handlers} = useCutGesture(state === "sealed", onCut);

    return (
        <button
            ref={buttonRef}
            type="button"
            aria-label={`Rozetnij paczkę ${pack.name}`}
            disabled={state !== "sealed"}
            data-state={state}
            data-testid="pack"
            className="pack"
            style={
                {
                    "--cut": cut.progress,
                    "--cut-direction": cut.fromLeft ? 1 : -1,
                    "--cut-origin": cut.fromLeft ? "left" : "right",
                } as React.CSSProperties
            }
            {...handlers}
        >
            <span aria-hidden="true" className="pack-strip pack-foil" />
            <span className="pack-body pack-foil">
                <span className="pack-label">
                    <LoadedImage
                        key={pack.logo}
                        src={pack.logo}
                        alt=""
                        width={320}
                        height={160}
                        fit="contain"
                        eager
                        className="h-24 w-full rounded-sm"
                    />
                    <span className="text-xs font-bold text-[#221b4b]">5 kart</span>
                </span>
            </span>
            <span aria-hidden="true" className="pack-cut-line" />
        </button>
    );
}
