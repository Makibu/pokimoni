"use client";

import {ErrorState} from "@/components/ui/states";

export default function RootError({reset}: {reset: () => void}) {
    return (
        <main className="mx-auto flex min-h-svh max-w-md items-center px-4">
            <ErrorState
                className="w-full"
                message="Coś poszło nie tak podczas wyświetlania tej strony."
                onRetry={reset}
            />
        </main>
    );
}
