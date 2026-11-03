/** A failed API call; `message` is written for the player. */
export class ApiError extends Error {
    constructor(
        readonly status: number,
        readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export async function apiFetch<T>(path: string, options: {method?: string; body?: unknown} = {}): Promise<T> {
    const res = await fetch(path, {
        method: options.method ?? "GET",
        headers: options.body === undefined ? undefined : {"Content-Type": "application/json"},
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
        const error = (data as {error?: {code?: string; message?: string}} | null)?.error;
        throw new ApiError(res.status, error?.code ?? "unknown", error?.message ?? "Coś poszło nie tak");
    }
    return data as T;
}
