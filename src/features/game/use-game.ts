"use client";

import {queryOptions, useMutation, useQuery, useQueryClient, type QueryClient} from "@tanstack/react-query";
import {useCallback} from "react";
import {minigameQuery, questsQuery} from "@/features/daily/queries";
import {friendsQuery, tradesQuery} from "@/features/social/queries";
import {apiFetch} from "@/lib/api-client";
import {queryKeys} from "@/lib/query-keys";
import type {CollectionCard, CollectionSet, Statistics} from "@/server/services/collection";
import type {OpenedCard, PackSource, ShopView} from "@/server/services/packs";
import type {AchievementView, EarnedRewards} from "@/server/services/progress";
import type {PlayerSummary, SlotNumber} from "@/server/services/wallet";

const PLAYER_REFRESH_MS = 60_000;
// Every change made in this app invalidates what it affects, so this only covers other devices.
const FRESH_FOR_MS = 30_000;

const playerQuery = queryOptions({
    queryKey: queryKeys.player,
    queryFn: () => apiFetch<PlayerSummary>("/api/player"),
    staleTime: FRESH_FOR_MS,
});

const shopQuery = queryOptions({
    queryKey: queryKeys.shop,
    queryFn: () => apiFetch<ShopView>("/api/shop"),
    staleTime: FRESH_FOR_MS,
});

const collectionQuery = queryOptions({
    queryKey: queryKeys.collection,
    queryFn: () => apiFetch<CollectionSet[]>("/api/collection"),
    staleTime: FRESH_FOR_MS,
});

const setCollectionQuery = (setId: string) =>
    queryOptions({
        queryKey: queryKeys.collectionSet(setId),
        queryFn: () => apiFetch<{set: {id: string; name: string}; cards: CollectionCard[]}>(`/api/collection/${setId}`),
        staleTime: FRESH_FOR_MS,
    });

const ownedCardsQuery = queryOptions({
    queryKey: queryKeys.ownedCards,
    queryFn: () => apiFetch<CollectionCard[]>("/api/collection/owned"),
    staleTime: FRESH_FOR_MS,
});

const achievementsQuery = queryOptions({
    queryKey: queryKeys.achievements,
    queryFn: () => apiFetch<AchievementView[]>("/api/achievements"),
    staleTime: FRESH_FOR_MS,
});

const statisticsQuery = queryOptions({
    queryKey: queryKeys.statistics,
    queryFn: () => apiFetch<Statistics>("/api/statistics"),
    staleTime: FRESH_FOR_MS,
});

export function usePlayer() {
    // The piggy bank grows over time, so its balance has to be refreshed.
    return useQuery({...playerQuery, refetchInterval: PLAYER_REFRESH_MS});
}

export function useShop() {
    return useQuery(shopQuery);
}

export function useCollectionSets() {
    return useQuery(collectionQuery);
}

export function useSetCollection(setId: string) {
    return useQuery(setCollectionQuery(setId));
}

export function useOwnedCards() {
    return useQuery(ownedCardsQuery);
}

export function useAchievements() {
    return useQuery(achievementsQuery);
}

export function useStatistics() {
    return useQuery(statisticsQuery);
}

const ROUTE_PREFETCHES: Record<string, (client: QueryClient) => unknown> = {
    "/": (client) =>
        Promise.all([
            client.prefetchQuery(playerQuery),
            client.prefetchQuery(ownedCardsQuery),
            client.prefetchQuery(shopQuery),
            client.prefetchQuery(questsQuery),
            client.prefetchQuery(minigameQuery),
        ]),
    "/shop": (client) => Promise.all([client.prefetchQuery(shopQuery), client.prefetchQuery(playerQuery)]),
    "/collection": (client) => client.prefetchQuery(collectionQuery),
    "/achievements": (client) => client.prefetchQuery(achievementsQuery),
    "/statistics": (client) => client.prefetchQuery(statisticsQuery),
    "/friends": (client) => Promise.all([client.prefetchQuery(friendsQuery), client.prefetchQuery(tradesQuery)]),
};

/** Loads a page's data when the player shows intent to open it, so the page appears without a skeleton. */
export function usePrefetchRoute() {
    const client = useQueryClient();
    return useCallback((href: string) => ROUTE_PREFETCHES[href]?.(client), [client]);
}

export function usePrefetchSet() {
    const client = useQueryClient();
    return useCallback((setId: string) => client.prefetchQuery(setCollectionQuery(setId)), [client]);
}

/**
 * Marks everything derived from the player's state as outdated. Not awaited by mutations: the response
 * has already updated what the player is looking at, and the rest refreshes in the background.
 */
export function useInvalidateGame() {
    const client = useQueryClient();
    return () => {
        for (const queryKey of [
            queryKeys.player,
            queryKeys.shop,
            queryKeys.collection,
            queryKeys.achievements,
            queryKeys.statistics,
            queryKeys.quests,
        ]) {
            void client.invalidateQueries({queryKey});
        }
    };
}

function usePatchPlayer() {
    const client = useQueryClient();
    return (patch: (player: PlayerSummary) => PlayerSummary) =>
        client.setQueryData<PlayerSummary>(queryKeys.player, (player) => player && patch(player));
}

export function useClaimDaily() {
    const invalidate = useInvalidateGame();
    const patchPlayer = usePatchPlayer();
    return useMutation({
        mutationFn: () =>
            apiFetch<{coins: number; reward: number; streakDay: number}>("/api/daily/claim", {method: "POST"}),
        onSuccess: ({coins, reward, streakDay}) => {
            patchPlayer((player) => ({...player, coins, daily: {claimable: false, streakDay, reward}}));
            invalidate();
        },
    });
}

export function useCollectPiggyBank() {
    const invalidate = useInvalidateGame();
    const patchPlayer = usePatchPlayer();
    return useMutation({
        mutationFn: () => apiFetch<{collected: number}>("/api/piggy-bank/collect", {method: "POST"}),
        onSuccess: ({collected}) => {
            patchPlayer((player) => ({
                ...player,
                coins: player.coins + collected,
                piggyBank: {...player.piggyBank, balance: 0},
            }));
            invalidate();
        },
    });
}

export function useSetSlot() {
    const invalidate = useInvalidateGame();
    const patchPlayer = usePatchPlayer();
    return useMutation({
        mutationFn: ({slot, cardId}: {slot: SlotNumber; cardId: string | null}) =>
            apiFetch<{collected: number; earned: EarnedRewards}>(`/api/slots/${slot}`, {
                method: "PUT",
                body: {cardId},
            }),
        onSuccess: ({collected}, {slot, cardId}) => {
            patchPlayer((player) => ({
                ...player,
                coins: player.coins + collected,
                piggyBank: {...player.piggyBank, balance: 0},
                slots: {...player.slots, [slot === 1 ? "slot1CardId" : "slot2CardId"]: cardId},
            }));
            invalidate();
        },
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
    const patchPlayer = usePatchPlayer();
    return useMutation({
        mutationFn: (input: {setId: string; source: PackSource}) =>
            apiFetch<OpenedPack>("/api/packs/open", {method: "POST", body: input}),
        onSuccess: ({coins}) => {
            patchPlayer((player) => ({...player, coins}));
            invalidate();
        },
    });
}

export function useClaimAchievement() {
    const client = useQueryClient();
    const invalidate = useInvalidateGame();
    return useMutation({
        mutationFn: (id: number) => apiFetch(`/api/achievements/${id}/claim`, {method: "POST"}),
        onSuccess: (_result, id) => {
            client.setQueryData<AchievementView[]>(queryKeys.achievements, (achievements) =>
                achievements?.map((achievement) =>
                    achievement.id === id ? {...achievement, claimed: true} : achievement,
                ),
            );
            invalidate();
        },
    });
}

export function useSendFeedback() {
    return useMutation({
        mutationFn: (description: string) => apiFetch("/api/feedback", {method: "POST", body: {description}}),
    });
}
