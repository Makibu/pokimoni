"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useInvalidateGame} from "@/features/game/use-game";
import {apiFetch} from "@/lib/api-client";
import {queryKeys} from "@/lib/query-keys";
import type {CreateTradeInput, UpdateProfileInput} from "@/lib/validation/social";
import type {Inbox} from "@/server/services/notifications";
import type {PublicPlayer} from "@/server/services/players";
import type {ProfileView} from "@/server/services/profile";
import type {EarnedRewards} from "@/server/services/progress";
import type {TradableCard} from "@/server/services/trades";
import type {ProfileStat} from "@/domain/profile";
import {friendsQuery, SOCIAL_REFRESH_MS, tradesQuery} from "./queries";

export function useUnreadNotifications() {
    return useQuery({
        queryKey: queryKeys.unreadNotifications,
        queryFn: () => apiFetch<{unread: number}>("/api/notifications/unread"),
        refetchInterval: SOCIAL_REFRESH_MS,
    });
}

export function useInbox() {
    return useQuery({
        queryKey: queryKeys.inbox,
        queryFn: () => apiFetch<Inbox>("/api/notifications"),
        refetchInterval: SOCIAL_REFRESH_MS,
    });
}

export function useFriends() {
    return useQuery({...friendsQuery, refetchInterval: SOCIAL_REFRESH_MS});
}

export function useTrades() {
    return useQuery({...tradesQuery, refetchInterval: SOCIAL_REFRESH_MS});
}

export function useProfile(userId: string) {
    return useQuery({
        queryKey: queryKeys.profile(userId),
        queryFn: () => apiFetch<ProfileView>(`/api/players/${userId}`),
    });
}

export function useProfileChoices() {
    return useQuery({
        queryKey: queryKeys.profileChoices,
        queryFn: () => apiFetch<{stats: ProfileStat[]; showcase: string[]}>("/api/profile"),
        // They only start the editor's form: it opens with a fresh copy, and nothing replaces it during editing.
        gcTime: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}

export function useTradeOptions(friendId: string) {
    return useQuery({
        queryKey: queryKeys.tradeOptions(friendId),
        queryFn: () => apiFetch<{mine: TradableCard[]; theirs: TradableCard[]}>(`/api/trades/options/${friendId}`),
    });
}

/** Anything social can change the inbox, the lists and the profiles at once. */
function useInvalidateSocial() {
    const client = useQueryClient();
    return () => {
        for (const queryKey of [queryKeys.notifications, queryKeys.friends, queryKeys.trades, queryKeys.profiles]) {
            void client.invalidateQueries({queryKey});
        }
    };
}

export function useMarkNotificationsRead() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (upToId: number) =>
            apiFetch<{unread: number}>("/api/notifications/read", {method: "POST", body: {upToId}}),
        onSuccess: (result) => client.setQueryData(queryKeys.unreadNotifications, result),
    });
}

export function usePlayerSearch() {
    return useMutation({
        mutationFn: (query: string) =>
            apiFetch<PublicPlayer[]>(`/api/players/search?q=${encodeURIComponent(query.trim())}`),
    });
}

export function useSendFriendRequest() {
    const invalidate = useInvalidateSocial();
    return useMutation({
        mutationFn: (username: string) => apiFetch("/api/friends/requests", {method: "POST", body: {username}}),
        onSuccess: invalidate,
    });
}

export function useAnswerFriendRequest() {
    const invalidate = useInvalidateSocial();
    return useMutation({
        mutationFn: ({id, answer}: {id: number; answer: "accept" | "reject"}) =>
            apiFetch(`/api/friends/requests/${id}/${answer}`, {method: "POST"}),
        onSuccess: invalidate,
    });
}

export function useCancelFriendRequest() {
    const invalidate = useInvalidateSocial();
    return useMutation({
        mutationFn: (id: number) => apiFetch(`/api/friends/requests/${id}`, {method: "DELETE"}),
        onSuccess: invalidate,
    });
}

export function useRemoveFriend() {
    const invalidateSocial = useInvalidateSocial();
    const invalidateGame = useInvalidateGame();
    return useMutation({
        mutationFn: (friendId: string) => apiFetch(`/api/friends/${friendId}`, {method: "DELETE"}),
        onSuccess: () => {
            invalidateSocial();
            // Cancelled offers give the held copies back.
            invalidateGame();
        },
    });
}

export function useCreateTrade() {
    const invalidateSocial = useInvalidateSocial();
    const invalidateGame = useInvalidateGame();
    return useMutation({
        mutationFn: (input: CreateTradeInput) => apiFetch("/api/trades", {method: "POST", body: input}),
        onSuccess: () => {
            invalidateSocial();
            invalidateGame();
        },
    });
}

export type TradeResult = {lostCard?: boolean; earned?: EarnedRewards};

export function useAnswerTrade() {
    const invalidateSocial = useInvalidateSocial();
    const invalidateGame = useInvalidateGame();
    return useMutation({
        mutationFn: ({id, answer}: {id: number; answer: "accept" | "reject" | "cancel"}) =>
            apiFetch<TradeResult>(`/api/trades/${id}/${answer}`, {method: "POST"}),
        onSettled: () => {
            // Also after a failure: the offer may have just been closed by the other player.
            invalidateSocial();
            invalidateGame();
        },
    });
}

export function useUpdateProfile() {
    const invalidate = useInvalidateSocial();
    return useMutation({
        mutationFn: (input: UpdateProfileInput) => apiFetch("/api/profile", {method: "PUT", body: input}),
        onSuccess: invalidate,
    });
}
