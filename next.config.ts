import type {NextConfig} from "next";

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
};

export default nextConfig;
