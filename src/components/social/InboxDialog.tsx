"use client";

import {formatDistanceToNow} from "date-fns";
import {pl} from "date-fns/locale";
import {useEffect} from "react";
import {toast} from "sonner";
import UserAvatar from "@/components/layout/UserAvatar";
import TradeOffer from "@/components/social/TradeOffer";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {LoadingRegion, Skeleton} from "@/components/ui/skeleton";
import {ErrorState} from "@/components/ui/states";
import {MAX_CARD_COPIES} from "@/domain/economy";
import {useSocialDialogs} from "@/features/social/social-dialogs";
import {useAnswerFriendRequest, useInbox, useMarkNotificationsRead} from "@/features/social/use-social";
import {cn} from "@/lib/utils";
import type {InboxItem} from "@/server/services/notifications";

/** Written without a verb form that shows gender, because nicks say nothing about it. */
function describe(item: InboxItem): string {
    switch (item.type) {
        case "friend_request":
            return "zaprasza Cię do znajomych";
        case "friend_accepted":
            return "przyjmuje Twoje zaproszenie";
        case "friend_removed":
            return "usuwa Cię ze znajomych";
        case "trade_offer":
            return "proponuje wymianę";
        case "trade_accepted":
            return "przyjmuje Twoją ofertę wymiany";
        case "trade_rejected":
            return "odrzuca Twoją ofertę wymiany";
        case "trade_cancelled":
            return item.trade?.incoming === false
                ? "kończy znajomość, więc Twoja oferta jest anulowana"
                : "wycofuje ofertę wymiany";
    }
}

function FriendRequestActions({requestId}: {requestId: number}) {
    const answer = useAnswerFriendRequest();
    return (
        <div className="flex flex-wrap gap-2">
            <Button
                disabled={answer.isPending}
                onClick={() =>
                    answer.mutate(
                        {id: requestId, answer: "accept"},
                        {
                            onSuccess: () => toast.success("Zaproszenie przyjęte"),
                            onError: (error) => toast.error(error.message),
                        },
                    )
                }
            >
                Przyjmij
            </Button>
            <Button
                variant="outline"
                disabled={answer.isPending}
                onClick={() =>
                    answer.mutate({id: requestId, answer: "reject"}, {onError: (error) => toast.error(error.message)})
                }
            >
                Odrzuć
            </Button>
        </div>
    );
}

function InboxEntry({item}: {item: InboxItem}) {
    const {openProfile} = useSocialDialogs();

    return (
        <li
            data-testid="inbox-item"
            className={cn("flex flex-col gap-3 rounded-lg p-3", item.read ? "bg-secondary" : "bg-lilac")}
        >
            <div className="flex items-start gap-3">
                <UserAvatar username={item.actor.username} avatar={item.actor.avatar} size={40} className="shrink-0" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium [overflow-wrap:anywhere]">
                        <button
                            type="button"
                            className="font-bold underline-offset-2 hover:underline"
                            onClick={() => openProfile(item.actor.id)}
                        >
                            {item.actor.username}
                        </button>{" "}
                        {describe(item)}
                    </p>
                    <p className="text-xs">
                        {formatDistanceToNow(new Date(item.createdAt), {addSuffix: true, locale: pl})}
                    </p>
                </div>
            </div>

            {item.friendRequest?.pending && <FriendRequestActions requestId={item.friendRequest.id} />}
            {item.type === "trade_offer" && item.trade && <TradeOffer trade={item.trade} compact />}
            {item.lostCard && (
                <p className="text-sm font-medium">
                    Masz już {MAX_CARD_COPIES} egzemplarzy tej karty, więc otrzymany egzemplarz przepadł.
                </p>
            )}
        </li>
    );
}

export default function InboxDialog({onClose}: {onClose: () => void}) {
    const inbox = useInbox();
    const {mutate: markRead} = useMarkNotificationsRead();
    const newestId = inbox.data?.items[0]?.id;
    const hasUnread = (inbox.data?.unread ?? 0) > 0;

    // Opening the inbox reads what it shows, including what arrives while it stays open.
    useEffect(() => {
        if (newestId !== undefined && hasUnread) markRead(newestId);
    }, [newestId, hasUnread, markRead]);

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            {/* Opens under the bell instead of in the middle of the screen. */}
            <DialogContent
                aria-describedby={undefined}
                className="top-[72px] right-4 left-auto max-h-[min(80svh,680px)] translate-x-0 translate-y-0 md:right-[max(1.5rem,calc((100vw-1200px)/2))] lg:top-[88px]"
            >
                <DialogHeader>
                    <DialogTitle>Skrzynka</DialogTitle>
                </DialogHeader>

                {inbox.data ? (
                    inbox.data.items.length === 0 ? (
                        <p className="py-6 text-center text-muted-foreground">
                            Nic tu jeszcze nie ma. Zaproszenia i oferty wymiany pojawią się w tym miejscu.
                        </p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {inbox.data.items.map((item) => (
                                <InboxEntry key={item.id} item={item} />
                            ))}
                        </ul>
                    )
                ) : inbox.error ? (
                    <ErrorState message={inbox.error.message} onRetry={() => void inbox.refetch()} />
                ) : (
                    <LoadingRegion className="flex flex-col gap-2">
                        <Skeleton className="h-20 rounded-lg" />
                        <Skeleton className="h-20 rounded-lg" />
                        <Skeleton className="h-20 rounded-lg" />
                    </LoadingRegion>
                )}
            </DialogContent>
        </Dialog>
    );
}
