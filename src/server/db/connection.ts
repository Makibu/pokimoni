const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Makes connections to remote servers encrypted, since a plain URL would otherwise connect without TLS.
 * `no-verify` because the Supabase pooler uses a certificate from its own CA. An `sslmode` already in the URL wins.
 */
export function secureConnectionUrl(url: string): string {
    const parsed = new URL(url);
    if (LOCAL_HOSTS.has(parsed.hostname) || parsed.searchParams.has("sslmode")) return url;
    parsed.searchParams.set("sslmode", "no-verify");
    return parsed.toString();
}
