"use client";

import {ThemeProvider} from "next-themes";
import ReactQueryClientProvider from "@/components/providers/ReactQueryClientProvider";
import {Toaster} from "@/components/ui/sonner";
import SessionGuard from "@/features/account/SessionGuard";

export default function ClientLayout({children}: {children: React.ReactNode}) {
    return (
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <ReactQueryClientProvider>
                <SessionGuard />
                {children}
                {/* Above the bottom nav and above the pack window's buttons, which stack on a phone. */}
                <Toaster
                    position="bottom-right"
                    offset={{bottom: "88px"}}
                    mobileOffset={{bottom: "148px"}}
                    richColors
                    expand
                />
            </ReactQueryClientProvider>
        </ThemeProvider>
    );
}
