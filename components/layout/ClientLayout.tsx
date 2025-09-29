"use client";

export const dynamic = 'force-dynamic';

import ReactQueryClientProvider from "@/components/providers/ReactQueryClientProvider";
import {AuthProvider} from "@/context/authContext";
import Navbar from "@/components/layout/Navbar";
import {Toaster} from "sonner";
import Sidebar from "@/components/layout/Sidebar";

export default function ClientLayout({children}: { children: React.ReactNode }) {
    return (
        <ReactQueryClientProvider>
            <AuthProvider>
                <Navbar/>
                <Sidebar/>
                {children}
                <Toaster position="bottom-right" richColors expand/>
            </AuthProvider>
        </ReactQueryClientProvider>
    );
}
