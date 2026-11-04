"use client";

import {ErrorState} from "@/components/ui/states";

export default function GameError({reset}: {reset: () => void}) {
    return <ErrorState message="Coś poszło nie tak podczas wyświetlania tej strony." onRetry={reset} />;
}
