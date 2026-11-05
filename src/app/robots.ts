import type {MetadataRoute} from "next";

/** Only the sign-in page is public; everything else redirects there without a session. */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {userAgent: "*", allow: ["/$", "/login", "/opengraph-image", "/_next/"], disallow: "/"},
        sitemap: "https://pokimoni.vercel.app/sitemap.xml",
    };
}
