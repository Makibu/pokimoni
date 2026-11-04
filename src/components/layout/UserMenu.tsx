"use client";

import {LogOut, Settings, User} from "lucide-react";
import dynamic from "next/dynamic";
import {useRouter} from "next/navigation";
import {useState} from "react";
import type {AccountTab} from "@/components/account/AccountDialog";
import UserAvatar from "@/components/layout/UserAvatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Skeleton} from "@/components/ui/skeleton";
import {useLogout, useSession} from "@/features/account/use-session";

const AccountDialog = dynamic(() => import("@/components/account/AccountDialog"));

const AVATAR_SIZE = 44;

export default function UserMenu() {
    const {data: account} = useSession();
    const logout = useLogout();
    const router = useRouter();
    const [openTab, setOpenTab] = useState<AccountTab | null>(null);

    function goToLogin() {
        router.replace("/login");
        router.refresh();
    }

    if (!account) return <Skeleton className="size-11 rounded-full" />;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger className="shrink-0 rounded-full" aria-label="Menu użytkownika">
                    <UserAvatar username={account.username} avatar={account.avatar} size={AVATAR_SIZE} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Witaj, {account.username}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setOpenTab("profile")}>
                        <User aria-hidden="true" /> Profil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOpenTab("settings")}>
                        <Settings aria-hidden="true" /> Ustawienia
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => logout.mutate(undefined, {onSettled: goToLogin})}
                        variant="destructive"
                    >
                        <LogOut aria-hidden="true" /> Wyloguj
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            {openTab && (
                <AccountDialog
                    account={account}
                    tab={openTab}
                    onTabChange={setOpenTab}
                    onClose={() => setOpenTab(null)}
                    onDeleted={goToLogin}
                />
            )}
        </>
    );
}
