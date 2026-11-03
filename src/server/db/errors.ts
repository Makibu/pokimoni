type PgErrorLike = {code?: string; constraint?: string; constraint_name?: string; cause?: unknown};

/** Name of the unique constraint violated by a failed statement, or null for any other error. */
export function violatedUniqueConstraint(error: unknown): string | null {
    for (let current = error as PgErrorLike | undefined; current; current = current.cause as PgErrorLike | undefined) {
        if (current.code === "23505") return current.constraint_name ?? current.constraint ?? "";
    }
    return null;
}
