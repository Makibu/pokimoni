"use client";

import {Award, Pencil} from "lucide-react";
import {useState} from "react";
import {toast} from "sonner";
import {badgeIcons} from "@/components/data-display/badge-icons";
import CardTile from "@/components/data-display/CardTile";
import UserAvatar from "@/components/layout/UserAvatar";
import ProfileEditor from "@/components/social/ProfileEditor";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {Button, buttonVariants} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {LoadingRegion, Skeleton} from "@/components/ui/skeleton";
import {ErrorState} from "@/components/ui/states";
import {useSocialDialogs} from "@/features/social/social-dialogs";
import {
    useAnswerFriendRequest,
    useCancelFriendRequest,
    useProfile,
    useRemoveFriend,
    useSendFriendRequest,
} from "@/features/social/use-social";
import {cn} from "@/lib/utils";
import type {ProfileView} from "@/server/services/profile";

const STAT_TONES = ["bg-lilac", "bg-sun", "bg-aqua"];

function SectionTitle({children}: {children: React.ReactNode}) {
    return <h3 className="font-display text-base font-bold">{children}</h3>;
}

function RelationActions({profile}: {profile: ProfileView}) {
    const {openTrade} = useSocialDialogs();
    const sendRequest = useSendFriendRequest();
    const answerRequest = useAnswerFriendRequest();
    const cancelRequest = useCancelFriendRequest();
    const removeFriend = useRemoveFriend();
    const showError = {onError: (error: Error) => toast.error(error.message)};
    const {player, requestId} = profile;

    switch (profile.relation) {
        case "self":
            return null;
        case "none":
            return (
                <Button
                    disabled={sendRequest.isPending}
                    onClick={() =>
                        sendRequest.mutate(player.username, {
                            onSuccess: () => toast.success("Zaproszenie wysłane"),
                            ...showError,
                        })
                    }
                >
                    Zaproś do znajomych
                </Button>
            );
        case "invited":
            return (
                <Button
                    variant="secondary"
                    disabled={cancelRequest.isPending}
                    onClick={() => requestId && cancelRequest.mutate(requestId, showError)}
                >
                    Wycofaj zaproszenie
                </Button>
            );
        case "invited_you":
            return (
                <>
                    <Button
                        disabled={answerRequest.isPending}
                        onClick={() => requestId && answerRequest.mutate({id: requestId, answer: "accept"}, showError)}
                    >
                        Przyjmij zaproszenie
                    </Button>
                    <Button
                        variant="secondary"
                        disabled={answerRequest.isPending}
                        onClick={() => requestId && answerRequest.mutate({id: requestId, answer: "reject"}, showError)}
                    >
                        Odrzuć
                    </Button>
                </>
            );
        case "friend":
            return (
                <>
                    <Button disabled={profile.hasOpenOffer} onClick={() => openTrade(player)}>
                        {profile.hasOpenOffer ? "Oferta już wysłana" : "Zaproponuj wymianę"}
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="secondary">Usuń ze znajomych</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Usunąć gracza {player.username} ze znajomych?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Otwarte oferty wymiany między Wami zostaną anulowane, a zablokowane karty wrócą do
                                    właścicieli.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                <AlertDialogAction
                                    className={buttonVariants({variant: "destructive"})}
                                    onClick={() => removeFriend.mutate(player.id, showError)}
                                >
                                    Usuń
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            );
    }
}

const RELATION_LABELS: Record<ProfileView["relation"], string> = {
    self: "To Twój profil",
    friend: "Na liście znajomych",
    invited: "Zaproszenie czeka na odpowiedź",
    invited_you: "Zaprasza Cię do znajomych",
    none: "Gracz",
};

function ProfileContent({profile, onEdit}: {profile: ProfileView; onEdit: () => void}) {
    const isOwn = profile.relation === "self";

    return (
        <>
            <DialogHeader className="flex-row items-center gap-4">
                <UserAvatar
                    username={profile.player.username}
                    avatar={profile.player.avatar}
                    size={72}
                    className="shrink-0"
                />
                <div className="min-w-0">
                    <DialogTitle className="truncate text-xl">{profile.player.username}</DialogTitle>
                    <p className="text-sm text-muted-foreground">{RELATION_LABELS[profile.relation]}</p>
                </div>
            </DialogHeader>

            <div className="flex flex-wrap gap-2 empty:hidden">
                <RelationActions profile={profile} />
                {isOwn && (
                    <Button variant="secondary" onClick={onEdit}>
                        <Pencil aria-hidden="true" />
                        Edytuj profil
                    </Button>
                )}
            </div>

            <dl className="grid gap-2 sm:grid-cols-3">
                {profile.stats.map((stat, index) => (
                    <div
                        key={stat.stat}
                        className={cn(
                            "flex items-baseline justify-between gap-3 rounded-tile px-3 py-2.5 sm:flex-col sm:justify-start sm:gap-0.5 sm:p-3",
                            STAT_TONES[index],
                        )}
                    >
                        <dt className="shrink-0 text-sm font-medium sm:order-2">{stat.label}</dt>
                        <dd className="font-display text-right text-base leading-tight font-bold [overflow-wrap:anywhere] sm:order-1 sm:text-left sm:text-lg">
                            {stat.value}
                        </dd>
                    </div>
                ))}
            </dl>

            <section className="flex flex-col gap-2">
                <SectionTitle>Odznaki</SectionTitle>
                {profile.badges.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Jeszcze bez odznak.</p>
                ) : (
                    <ul className="flex flex-wrap gap-2">
                        {profile.badges.map((badge) => {
                            const Icon = badgeIcons[badge.icon] ?? Award;
                            return (
                                <li
                                    key={badge.id}
                                    className="flex items-center gap-1.5 rounded-full bg-sun px-3 py-1.5 text-sm font-bold text-foreground"
                                >
                                    <Icon aria-hidden="true" className="size-4" />
                                    {badge.name}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <section className="flex flex-col gap-2">
                <SectionTitle>Gablota</SectionTitle>
                {profile.showcase.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {isOwn ? "Pusta. Wybierz karty, którymi chcesz się pochwalić." : "Gablota jest pusta."}
                    </p>
                ) : (
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5" data-testid="showcase">
                        {profile.showcase.map((card) => (
                            <li key={card.id}>
                                <CardTile
                                    name={card.name}
                                    rarity={card.rarity}
                                    imageSmall={card.imageSmall}
                                    imageLarge={card.imageLarge}
                                    income={card.income}
                                    quantity={1}
                                    visibleNames
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </>
    );
}

export default function ProfileDialog({userId, onClose}: {userId: string; onClose: () => void}) {
    const profile = useProfile(userId);
    const [editing, setEditing] = useState(false);

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl" aria-describedby={undefined}>
                {profile.data ? (
                    editing ? (
                        <ProfileEditor onDone={() => setEditing(false)} />
                    ) : (
                        <ProfileContent profile={profile.data} onEdit={() => setEditing(true)} />
                    )
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Profil gracza</DialogTitle>
                        </DialogHeader>
                        {profile.error ? (
                            <ErrorState message={profile.error.message} onRetry={() => void profile.refetch()} />
                        ) : (
                            <LoadingRegion className="flex flex-col gap-3">
                                <Skeleton className="size-18 rounded-full" />
                                <div className="grid gap-2 sm:grid-cols-3">
                                    <Skeleton className="h-20 rounded-tile" />
                                    <Skeleton className="h-20 rounded-tile" />
                                    <Skeleton className="h-20 rounded-tile" />
                                </div>
                                <Skeleton className="h-40 rounded-lg" />
                            </LoadingRegion>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
