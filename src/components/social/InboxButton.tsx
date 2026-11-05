"use client";

import {Bell} from "lucide-react";
import dynamic from "next/dynamic";
import {usePathname} from "next/navigation";
import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {useUnreadNotifications} from "@/features/social/use-social";

const InboxDialog = dynamic(() => import("@/components/social/InboxDialog"), {ssr: false});

export default function InboxButton() {
    const {data, refetch} = useUnreadNotifications();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    // Besides the regular refresh, entering a page shows what arrived in the meantime.
    useEffect(() => {
        void refetch({cancelRefetch: false});
    }, [pathname, refetch]);

    const unread = data?.unread ?? 0;

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={unread > 0 ? `Skrzynka, nieprzeczytane: ${unread}` : "Skrzynka"}
                onClick={() => setOpen(true)}
            >
                <Bell aria-hidden="true" className="size-[22px]" />
                {unread > 0 && (
                    <span
                        aria-hidden="true"
                        data-testid="inbox-dot"
                        className="absolute top-2 right-2 size-2.5 rounded-full bg-dot"
                    />
                )}
            </Button>
            {open && <InboxDialog onClose={() => setOpen(false)} />}
        </>
    );
}
