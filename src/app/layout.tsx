import type {Metadata, Viewport} from "next";
import {Onest, Unbounded} from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/layout/ClientLayout";

const onest = Onest({
    variable: "--font-onest",
    subsets: ["latin", "latin-ext"],
    display: "swap",
});

const unbounded = Unbounded({
    variable: "--font-unbounded",
    // Headings only ever use this weight; the full variable font is several times heavier.
    weight: "700",
    subsets: ["latin", "latin-ext"],
    display: "swap",
});

export const metadata: Metadata = {
    title: "Pokimoni",
    description: "Zbieraj karty, otwieraj paczki i zarabiaj monety.",
};

export const viewport: Viewport = {
    themeColor: [
        {media: "(prefers-color-scheme: light)", color: "#f7f5ff"},
        {media: "(prefers-color-scheme: dark)", color: "#15112b"},
    ],
};

export default function RootLayout({children}: {children: React.ReactNode}) {
    return (
        // next-themes sets the theme class before the first paint, so the server markup differs on purpose.
        <html lang="pl" className={`${onest.variable} ${unbounded.variable}`} suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://images.pokemontcg.io" />
            </head>
            <body className="antialiased">
                <ClientLayout>{children}</ClientLayout>
            </body>
        </html>
    );
}
