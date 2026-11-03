"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {apiFetch} from "@/lib/api-client";
import {queryKeys} from "@/lib/query-keys";
import type {CollectionCard, CollectionSet, Statistics} from "@/server/services/collection";
import type {OpenedCard, PackSource, ShopView} from "@/server/services/packs";
import type {AchievementView, EarnedRewards} from "@/server/services/progress";
import type {PlayerSummary, SlotNumber} from "@/server/services/wallet";

const PLAYER_REFRESH_MS = 60_000;

export function usePlayer() {
    return useQuery({
        queryKey: queryKeys.player,
        queryFn: () => apiFetch<PlayerSummary>("/api/player"),
        // The piggy bank grows over time, so its balance has to be refreshed.
        refetchInterval: PLAYER_REFRESH_MS,
        staleTime: 0,
    });
}

export function useShop() {
    return useQuery({queryKey: queryKeys.shop, queryFn: () => apiFetch<ShopView>("/api/shop"), staleTime: 0});
}

export function useCollectionSets() {
    return useQuery({
        queryKey: queryKeys.collection,
        queryFn: () => apiFetch<CollectionSet[]>("/api/collection"),
        staleTime: 0,
    });
}

export function useSetCollection(setId: string) {
    return useQuery({
        queryKey: queryKeys.collectionSet(setId),
        queryFn: () => apiFetch<{set: {id: string; name: string}; cards: CollectionCard[]}>(`/api/collection/${setId}`),
        staleTime: 0,
    });
}

export function useOwnedCards() {
    return useQuery({
        queryKey: queryKeys.ownedCards,
        queryFn: () => apiFetch<CollectionCard[]>("/api/collection/owned"),
        staleTime: 0,
    });
}

export function useAchievements() {
    return useQuery({
        queryKey: queryKeys.achievements,
        queryFn: () => apiFetch<AchievementView[]>("/api/achievements"),
        staleTime: 0,
    });
}

export function useStatistics() {
    return useQuery({
        queryKey: queryKeys.statistics,
        queryFn: () => apiFetch<Statistics>("/api/statistics"),
        staleTime: 0,
    });
}

/** Marks everything derived from the player's state as outdated. */
function useInvalidateGame() {
    const queryClient = useQueryClient();
    return () =>
        Promise.all(
            [queryKeys.player, queryKeys.shop, queryKeys.collection, queryKeys.achievements, queryKeys.statistics].map(
                (queryKey) => queryClient.invalidateQueries({queryKey}),
            ),
        );
}

export function useClaimDaily() {
    const invalidate = useInvalidateGame();
    return useMutation({
        mutationFn: () =>
            apiFetch<{coins: number; reward: number; streakDay: number}>("/api/daily/claim", {method: "POST"}),
        onSuccess: invalidate,
    });
}

export function useCollectPiggyBank() {
    const invalidate = useInvalidateGame();
    return useMutation({
        mutationFn: () => apiFetch<{collected: number}>("/api/piggy-bank/collect", {method: "POST"}),
        onSuccess: invalidate,
    });
}

export function useSetSlot() {
    const invalidate = useInvalidateGame();
    return useMutation({
        mutationFn: ({slot, cardId}: {slot: SlotNumber; cardId: string | null}) =>
            apiFetch<{collected: number; earned: EarnedRewards}>(`/api/slots/${slot}`, {
                method: "PUT",
                body: {cardId},
            }),
        onSuccess: invalidate,
    });
}

export type OpenedPack = {
    openingId: number;
    isGodPack: boolean;
    coins: number;
    set: {id: string; name: string; logo: string};
    cards: OpenedCard[];
    earned: EarnedRewards;
};

export function useOpenPack() {
    const invalidate = useInvalidateGame();
    return useMutation({
        mutationFn: (input: {setId: string; source: PackSource}) =>
            apiFetch<OpenedPack>("/api/packs/open", {method: "POST", body: input}),
        onSuccess: invalidate,
    });
}

export function useClaimAchievement() {
    const invalidate = useInvalidateGame();
    return useMutation({
        mutationFn: (id: number) => apiFetch(`/api/achievements/${id}/claim`, {method: "POST"}),
        onSuccess: invalidate,
    });
}

export function useSendFeedback() {
    return useMutation({
        mutationFn: (description: string) => apiFetch("/api/feedback", {method: "POST", body: {description}}),
    });
}
