"use client";

import {usePathname, useRouter} from "next/navigation";
import {useEffect} from "react";
import {useLogout, useSession} from "./use-session";

/**
 * The proxy only checks the token signature. When the server rejects a validly signed token
 * (account deleted, password changed elsewhere), this clears the cookie and returns to login.
 */
export default function SessionGuard() {
    const pathname = usePathname();
    const router = useRouter();
    const {data: account} = useSession();
    const {mutate: logout} = useLogout();

    const sessionRejected = account === null && pathname !== "/login";

    useEffect(() => {
        if (!sessionRejected) return;
        logout(undefined, {onSettled: () => router.replace("/login")});
    }, [sessionRejected, logout, router]);

    return null;
}
