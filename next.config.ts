import type {NextConfig} from "next";

const IMAGE_HOSTS = "https://images.pokemontcg.io https://raw.githubusercontent.com";

// Without nonces, because they would force every page to render on each request and lose the static shell behind the
// fast first paint. Next's own inline scripts therefore need 'unsafe-inline'. The app renders no raw HTML, and the
// rest of the policy still blocks foreign scripts, framing, form targets and connections to other hosts.
const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: ${IMAGE_HOSTS}`,
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
    {key: "X-Content-Type-Options", value: "nosniff"},
    {key: "X-Frame-Options", value: "DENY"},
    {key: "Referrer-Policy", value: "strict-origin-when-cross-origin"},
    {key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()"},
    {key: "Cross-Origin-Opener-Policy", value: "same-origin"},
];

const nextConfig: NextConfig = {
    // Dev server only. Without this, `next dev` refuses its hot-reload socket on any host other than localhost,
    // the page never hydrates and every button is dead. Lets the app be tested on 127.0.0.1 and from a phone.
    allowedDevOrigins: ["127.0.0.1", "192.168.*.*"],
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "raw.githubusercontent.com",
            },
            {
                protocol: "https",
                hostname: "images.pokemontcg.io",
            },
        ],
    },
    async headers() {
        // The dev server needs eval and a websocket, which this policy rightly refuses.
        const policy =
            process.env.NODE_ENV === "production"
                ? [{key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY}]
                : [];
        // Static files need none of this, and it would add its length to each of the dozens of chunks.
        return [{source: "/((?!_next/static|_next/image).*)", headers: [...SECURITY_HEADERS, ...policy]}];
    },
};

export default nextConfig;
