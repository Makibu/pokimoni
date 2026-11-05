import {queryOptions} from "@tanstack/react-query";
import {apiFetch} from "@/lib/api-client";
import {queryKeys} from "@/lib/query-keys";
import type {MinigameToday} from "@/server/services/minigames";
import type {QuestView} from "@/server/services/quests";

// Changes made here update these right away, so this only covers other devices and the 10:00 change of day.
const FRESH_FOR_MS = 30_000;

export const questsQuery = queryOptions({
    queryKey: queryKeys.quests,
    queryFn: () => apiFetch<QuestView[]>("/api/quests"),
    staleTime: FRESH_FOR_MS,
});

export const minigameQuery = queryOptions({
    queryKey: queryKeys.minigame,
    queryFn: () => apiFetch<MinigameToday>("/api/minigame"),
    staleTime: FRESH_FOR_MS,
});
