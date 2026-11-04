"use client";

import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {useState} from "react";
import {ApiError} from "@/lib/api-client";

const MAX_RETRIES = 2;
const KEEP_UNUSED_DATA_MS = 30 * 60 * 1000;

export default function ReactQueryClientProvider({children}: {children: React.ReactNode}) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: Infinity,
                        // Returning to a page shows its data at once, then refreshes it in the background.
                        gcTime: KEEP_UNUSED_DATA_MS,
                        // A client error will not fix itself, so the error state shows without waiting.
                        retry: (failureCount, error) =>
                            !(error instanceof ApiError && error.status < 500) && failureCount < MAX_RETRIES,
                    },
                },
            }),
    );

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
