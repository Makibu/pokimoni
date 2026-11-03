/** Central list of React Query keys, so invalidations always match the queries they target. */
export const queryKeys = {
    session: ["session"] as const,
    player: ["player"] as const,
    shop: ["shop"] as const,
    collection: ["collection"] as const,
    collectionSet: (setId: string) => ["collection", "set", setId] as const,
    ownedCards: ["collection", "owned"] as const,
    achievements: ["achievements"] as const,
    statistics: ["statistics"] as const,
};
