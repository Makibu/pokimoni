import type {Metadata} from "next";
import {Sora} from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/layout/ClientLayout";

const sora = Sora({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Pokimoni",
    description: "Super duper pokimoni game",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
    return (
        <html lang="en">
            <body className={`${sora.className} antialiased`}>
                <ClientLayout>{children}</ClientLayout>
            </body>
        </html>
    );
}
