"use client";

import {Search} from "lucide-react";
import {useState} from "react";
import {toast} from "sonner";
import UserAvatar from "@/components/layout/UserAvatar";
import PageHeader from "@/components/layout/PageHeader";
import {FriendsSkeleton} from "@/components/social/FriendsSkeleton";
import TradeOffer from "@/components/social/TradeOffer";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {ErrorState} from "@/components/ui/states";
import {useSocialDialogs} from "@/features/social/social-dialogs";
import {
    useAnswerFriendRequest,
    useCancelFriendRequest,
    useFriends,
    usePlayerSearch,
    useSendFriendRequest,
    useTrades,
} from "@/features/social/use-social";
import type {PublicPlayer} from "@/server/services/players";

const PANEL = "flex flex-col gap-4 rounded-section bg-card p-5 md:p-6";
const ROW = "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-secondary p-3";

function PanelTitle({children}: {children: React.ReactNode}) {
    return <h2 className="font-display text-base font-bold md:text-lg">{children}</h2>;
}

/** A nick with its avatar. Opens the player's profile. */
function PlayerLink({player}: {player: PublicPlayer}) {
    const {openProfile} = useSocialDialogs();
    return (
        <button
            type="button"
            onClick={() => openProfile(player.id)}
            className="flex min-h-11 min-w-0 flex-1 basis-40 items-center gap-3 rounded-full text-left"
        >
            <UserAvatar username={player.username} avatar={player.avatar} size={44} className="shrink-0" />
            <span className="truncate font-bold">{player.username}</span>
        </button>
    );
}

function PlayerSearch() {
    const search = usePlayerSearch();
    const invite = useSendFriendRequest();
    const [query, setQuery] = useState("");

    function submit(event: React.FormEvent) {
        event.preventDefault();
        search.mutate(query);
    }

    return (
        <section className={PANEL}>
            <PanelTitle>Znajdź gracza</PanelTitle>
            <form onSubmit={submit} className="flex flex-col gap-2">
                <Label htmlFor="player-search">Nick gracza</Label>
                <div className="flex gap-2">
                    <Input
                        id="player-search"
                        autoComplete="off"
                        maxLength={20}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="min-w-0 flex-1 rounded-full"
                    />
                    <Button type="submit" disabled={search.isPending}>
                        <Search aria-hidden="true" />
                        Szukaj
                    </Button>
                </div>
            </form>

            {search.error && (
                <p role="alert" className="rounded-[14px] bg-peach p-3 text-sm font-medium text-foreground">
                    {search.error.message}
                </p>
            )}
            {search.data &&
                (search.data.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nie ma gracza o takim nicku.</p>
                ) : (
                    <ul className="flex flex-col gap-2" aria-label="Wyniki wyszukiwania">
                        {search.data.map((player) => (
                            <li key={player.id} className={ROW}>
                                <PlayerLink player={player} />
                                <Button
                                    disabled={invite.isPending}
                                    onClick={() =>
                                        invite.mutate(player.username, {
                                            onSuccess: () =>
                                                toast.success(`Zaproszenie wysłane do: ${player.username}`),
                                            onError: (error) => toast.error(error.message),
                                        })
                                    }
                                >
                                    Zaproś
                                </Button>
                            </li>
                        ))}
                    </ul>
                ))}
        </section>
    );
}

function Invitations() {
    const {data} = useFriends();
    const answer = useAnswerFriendRequest();
    const cancel = useCancelFriendRequest();
    const showError = {onError: (error: Error) => toast.error(error.message)};

    return (
        <section className={PANEL}>
            <PanelTitle>Zaproszenia</PanelTitle>
            {data?.incoming.length === 0 && data.outgoing.length === 0 && (
                <p className="text-sm text-muted-foreground">Żadne zaproszenie nie czeka na odpowiedź.</p>
            )}
            <ul className="flex flex-col gap-2 empty:hidden">
                {data?.incoming.map((request) => (
                    <li key={request.id} className={ROW}>
                        <PlayerLink player={request.player} />
                        <div className="flex gap-2">
                            <Button
                                disabled={answer.isPending}
                                onClick={() => answer.mutate({id: request.id, answer: "accept"}, showError)}
                            >
                                Przyjmij
                            </Button>
                            <Button
                                variant="outline"
                                disabled={answer.isPending}
                                onClick={() => answer.mutate({id: request.id, answer: "reject"}, showError)}
                            >
                                Odrzuć
                            </Button>
                        </div>
                    </li>
                ))}
                {data?.outgoing.map((request) => (
                    <li key={request.id} className={ROW}>
                        <PlayerLink player={request.player} />
                        <Button
                            variant="outline"
                            disabled={cancel.isPending}
                            onClick={() => cancel.mutate(request.id, showError)}
                        >
                            Wycofaj
                        </Button>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function FriendList() {
    const {data: friends} = useFriends();
    const {data: trades} = useTrades();
    const {openTrade} = useSocialDialogs();
    const offeredTo = new Set(trades?.outgoing.map((trade) => trade.partner.id));

    return (
        <section className={PANEL}>
            <PanelTitle>Twoi znajomi</PanelTitle>
            {friends?.friends.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Nikogo tu jeszcze nie ma. Znajdź gracza po nicku i wyślij zaproszenie.
                </p>
            ) : (
                <ul className="grid gap-2 lg:grid-cols-2">
                    {friends?.friends.map((friend) => (
                        <li key={friend.id} className={ROW}>
                            <PlayerLink player={friend} />
                            <Button disabled={offeredTo.has(friend.id)} onClick={() => openTrade(friend)}>
                                {offeredTo.has(friend.id) ? "Oferta wysłana" : "Wymień się"}
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function OpenTrades() {
    const {data} = useTrades();
    const {openProfile} = useSocialDialogs();
    if (!data || (data.incoming.length === 0 && data.outgoing.length === 0)) return null;

    const groups = [
        {title: "Oferty dla Ciebie", trades: data.incoming, partnerLabel: "Od"},
        {title: "Twoje oferty", trades: data.outgoing, partnerLabel: "Dla"},
    ];

    return (
        <section className={PANEL}>
            <PanelTitle>Otwarte wymiany</PanelTitle>
            {groups.map(
                (group) =>
                    group.trades.length > 0 && (
                        <div key={group.title} className="flex flex-col gap-2">
                            <h3 className="text-sm font-bold">{group.title}</h3>
                            <ul className="grid gap-2 lg:grid-cols-2">
                                {group.trades.map((trade) => (
                                    <li key={trade.id} className="flex flex-col gap-3 rounded-lg bg-secondary p-3">
                                        <p className="text-sm font-medium">
                                            {group.partnerLabel}:{" "}
                                            <button
                                                type="button"
                                                className="font-bold underline-offset-2 hover:underline"
                                                onClick={() => openProfile(trade.partner.id)}
                                            >
                                                {trade.partner.username}
                                            </button>
                                        </p>
                                        <TradeOffer trade={trade} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ),
            )}
        </section>
    );
}

export default function FriendsPage() {
    const friends = useFriends();
    const trades = useTrades();
    const header = (
        <PageHeader title="Znajomi" description="Zapraszaj graczy i wymieniaj się z nimi kartami" tone="pink" />
    );

    if (!friends.data || !trades.data) {
        const error = friends.error ?? trades.error;
        return (
            <div className="flex flex-col gap-4 lg:gap-6">
                {header}
                {error ? (
                    <ErrorState
                        message={error.message}
                        onRetry={() => {
                            void friends.refetch();
                            void trades.refetch();
                        }}
                    />
                ) : (
                    <FriendsSkeleton />
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            {header}
            <OpenTrades />
            <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6">
                <PlayerSearch />
                <Invitations />
            </div>
            <FriendList />
        </div>
    );
}
