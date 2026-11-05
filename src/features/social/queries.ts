import {queryOptions} from "@tanstack/react-query";
import {apiFetch} from "@/lib/api-client";
import {queryKeys} from "@/lib/query-keys";
import type {FriendsView} from "@/server/services/friends";
import type {TradeView} from "@/server/services/trades";

/** Nothing pushes changes from other players, so the social views ask for them regularly. */
export const SOCIAL_REFRESH_MS = 30_000;

export const friendsQuery = queryOptions({
    queryKey: queryKeys.friends,
    queryFn: () => apiFetch<FriendsView>("/api/friends"),
});

export const tradesQuery = queryOptions({
    queryKey: queryKeys.trades,
    queryFn: () => apiFetch<{incoming: TradeView[]; outgoing: TradeView[]}>("/api/trades"),
});
