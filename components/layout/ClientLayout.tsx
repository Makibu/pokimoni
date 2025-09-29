"use client";

import ReactQueryClientProvider from "@/components/providers/ReactQueryClientProvider";
import dynamic from "next/dynamic";
import {AuthProvider as RawAuthProvider} from "@/context/authContext";

const AuthProvider = dynamic(
    () => Promise.resolve((props: { children: React.ReactNode }) => <RawAuthProvider {...props} />),
    {ssr: false}
);
const Navbar = dynamic(() => import("@/components/layout/Navbar"), {ssr: false});

export default function ClientLayout({children}: { children: React.ReactNode }) {
    return (
        <ReactQueryClientProvider>
            <AuthProvider>
                {/*<Navbar/>*/}
                {/*<Sidebar/>*/}
                {children}
                {/*<Toaster position="bottom-right" richColors expand/>*/}
            </AuthProvider>
        </ReactQueryClientProvider>
    );
}
