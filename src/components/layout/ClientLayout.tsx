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
                <Toaster position="bottom-right" mobileOffset={{bottom: "88px"}} richColors expand />
            </ReactQueryClientProvider>
        </ThemeProvider>
    );
}
