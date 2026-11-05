"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import type {MinigameAction} from "@/domain/minigames";
import {apiFetch} from "@/lib/api-client";
import {queryKeys} from "@/lib/query-keys";
import type {MinigameToday} from "@/server/services/minigames";
import type {QuestView} from "@/server/services/quests";
import {minigameQuery, questsQuery} from "./queries";

export function useQuests() {
    return useQuery(questsQuery);
}

export function useClaimQuest() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (slot: number) =>
            apiFetch<{coins: number; reward: number}>(`/api/quests/${slot}/claim`, {method: "POST"}),
        onSuccess: (_result, slot) => {
            client.setQueryData<QuestView[]>(queryKeys.quests, (quests) =>
                quests?.map((quest) => (quest.slot === slot ? {...quest, claimed: true} : quest)),
            );
            void client.invalidateQueries({queryKey: queryKeys.player});
        },
        // Usually a list left open past 10:00, so the player gets to see the new day's quests.
        onError: () => void client.invalidateQueries({queryKey: queryKeys.quests}),
    });
}

export function useMinigame() {
    return useQuery(minigameQuery);
}

export function useStartMinigame() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: () => apiFetch<MinigameToday>("/api/minigame/start", {method: "POST"}),
        onSuccess: (today) => client.setQueryData(queryKeys.minigame, today),
    });
}

export function useMinigameAction() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (action: MinigameAction) =>
            apiFetch<MinigameToday>("/api/minigame/action", {method: "POST", body: action}),
        onSuccess: (today) => {
            client.setQueryData(queryKeys.minigame, today);
            if (today.status === "in_progress") return;
            // Finishing pays the reward and counts for a quest.
            void client.invalidateQueries({queryKey: queryKeys.player});
            void client.invalidateQueries({queryKey: queryKeys.quests});
        },
        // A rejected move or a new game day: what the server holds decides what the player sees next.
        onError: () => void client.invalidateQueries({queryKey: queryKeys.minigame}),
    });
}
