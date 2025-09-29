"use client";

import ReactQueryClientProvider from "@/components/providers/ReactQueryClientProvider";
import {AuthProvider} from "@/context/authContext";
import {Sidebar} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import {Toaster} from "sonner";

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
