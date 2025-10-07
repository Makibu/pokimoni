"use client";

import ReactQueryClientProvider from "@/components/providers/ReactQueryClientProvider";
import {AuthProvider} from "@/context/authContext";
import Navbar from "@/components/layout/Navbar";
import {Toaster} from "sonner";
import Sidebar from "@/components/layout/Sidebar";
import {TouchProvider} from "@/components/ui/hybrid-tooltip";

export default function ClientLayout({children}: { children: React.ReactNode }) {
    return (
        <ReactQueryClientProvider>
            <AuthProvider>
                <TouchProvider>
                    <Navbar/>
                    <Sidebar/>
                    {children}
                    <Toaster position="bottom-right" richColors expand/>
                </TouchProvider>
            </AuthProvider>
        </ReactQueryClientProvider>
    );
}
