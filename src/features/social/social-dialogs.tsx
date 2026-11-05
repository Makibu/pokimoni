"use client";

import dynamic from "next/dynamic";
import {createContext, useContext, useMemo, useState} from "react";
import type {PublicPlayer} from "@/server/services/players";

const ProfileDialog = dynamic(() => import("@/components/social/ProfileDialog"), {ssr: false});
const TradeDialog = dynamic(() => import("@/components/social/TradeDialog"), {ssr: false});

type SocialDialogs = {
    openProfile: (userId: string) => void;
    openTrade: (partner: PublicPlayer) => void;
};

const SocialDialogsContext = createContext<SocialDialogs | null>(null);

/**
 * A profile can be opened from the inbox, the friends page and search results, and a trade from a profile.
 * Rendering them here lets each one open on top of what the player is looking at and return to it when closed.
 */
export function SocialDialogsProvider({children}: {children: React.ReactNode}) {
    const [profileUserId, setProfileUserId] = useState<string | null>(null);
    const [tradePartner, setTradePartner] = useState<PublicPlayer | null>(null);
    const dialogs = useMemo(() => ({openProfile: setProfileUserId, openTrade: setTradePartner}), []);

    return (
        <SocialDialogsContext.Provider value={dialogs}>
            {children}
            {profileUserId && <ProfileDialog userId={profileUserId} onClose={() => setProfileUserId(null)} />}
            {tradePartner && <TradeDialog partner={tradePartner} onClose={() => setTradePartner(null)} />}
        </SocialDialogsContext.Provider>
    );
}

export function useSocialDialogs(): SocialDialogs {
    const dialogs = useContext(SocialDialogsContext);
    if (!dialogs) throw new Error("useSocialDialogs must be used inside SocialDialogsProvider");
    return dialogs;
}
