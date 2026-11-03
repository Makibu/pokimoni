"use client";

import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {LogOut, Settings, Trash2, User} from "lucide-react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Separator} from "@/components/ui/separator";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import {useIsMobile} from "@/hooks/useIsMobile";
import {useState} from "react";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {useDeleteAccount, useLogout, useSession, useUpdateAccount} from "@/features/account/use-session";
import {useSettings} from "@/features/settings/use-settings";
import {updateAccountSchema, type Account, type UpdateAccountInput} from "@/lib/validation/account";

function UserAvatar({account, avatar, className}: {account: Account; avatar: number | null; className?: string}) {
    return (
        <Avatar className={className}>
            {avatar ? (
                <AvatarImage src={`/avatars/avatar-${avatar}.webp`} />
            ) : (
                <AvatarFallback className="bg-blue-500 text-white text-xl">{account.username.charAt(0)}</AvatarFallback>
            )}
        </Avatar>
    );
}

function ProfileTab({account, onDeleted}: {account: Account; onDeleted: () => void}) {
    const updateAccount = useUpdateAccount();
    const deleteAccount = useDeleteAccount();

    const [selectedAvatar, setSelectedAvatar] = useState(account.avatar);
    const [username, setUsername] = useState(account.username);
    const [email, setEmail] = useState(account.email);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [deletePassword, setDeletePassword] = useState("");

    const needsCurrentPassword = newPassword !== "" || email.trim().toLowerCase() !== account.email.toLowerCase();

    function handleSave() {
        if (newPassword && newPassword !== confirmPassword) {
            toast.error("Hasła nie są takie same");
            return;
        }
        const changes: UpdateAccountInput = {
            username,
            avatar: selectedAvatar,
            email: email.trim(),
            ...(newPassword ? {newPassword} : {}),
            ...(needsCurrentPassword ? {currentPassword} : {}),
        };
        const input = updateAccountSchema.safeParse(changes);
        if (!input.success) {
            toast.error(input.error.issues[0].message);
            return;
        }
        updateAccount.mutate(input.data, {
            onSuccess: () => {
                toast.success("Profil zaktualizowany");
                setNewPassword("");
                setConfirmPassword("");
                setCurrentPassword("");
            },
            onError: (error) => toast.error(error.message),
        });
    }

    function handleDelete() {
        deleteAccount.mutate(deletePassword, {
            onSuccess: () => {
                toast.success("Konto zostało trwale usunięte");
                onDeleted();
            },
            onError: (error) => toast.error(error.message),
        });
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-4">
                <UserAvatar account={account} avatar={selectedAvatar} className="h-20 w-20" />
                <div>
                    <h3 className="text-lg font-semibold">{account.username}</h3>
                    <p className="text-sm text-muted-foreground">Użytkownik</p>
                </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-3 items-start">
                <Label className="text-base">Avatar</Label>
                <div className="flex flex-wrap gap-3">
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                        <button
                            key={num}
                            onClick={() => setSelectedAvatar(num)}
                            aria-label={`Avatar ${num}`}
                            aria-pressed={selectedAvatar === num}
                            className={`rounded-full border-2 transition-all hover:scale-110 cursor-pointer ${
                                selectedAvatar === num ? "border-blue-500 ring-2 ring-blue-300" : "border-transparent"
                            }`}
                        >
                            <Image
                                src={`/avatars/avatar-${num}.webp`}
                                alt=""
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            </div>

            <Separator />

            <div className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="profile-username">Nazwa użytkownika</Label>
                    <Input id="profile-username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="profile-new-password">Nowe hasło</Label>
                    <Input
                        id="profile-new-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Wprowadź nowe hasło"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="profile-confirm-password">Potwierdź hasło</Label>
                    <Input
                        id="profile-confirm-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Potwierdź nowe hasło"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>

                {needsCurrentPassword && (
                    <div className="grid gap-2">
                        <Label htmlFor="profile-current-password">Obecne hasło</Label>
                        <Input
                            id="profile-current-password"
                            type="password"
                            autoComplete="current-password"
                            placeholder="Wymagane do zmiany emaila lub hasła"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </div>
                )}
            </div>

            <div className="flex justify-between pt-4">
                <Button onClick={handleSave} disabled={updateAccount.isPending}>
                    Zapisz zmiany
                </Button>

                <AlertDialog onOpenChange={() => setDeletePassword("")}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4" />
                            Usuń konto
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className={"text-red-500 font-bold"}>
                                Trwałe usunięcie konta
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                To spowoduje trwałe usunięcie Twojego konta oraz wszystkich danych. Operacji nie będzie
                                można cofnąć.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="grid gap-2">
                            <Label htmlFor="delete-password">Hasło</Label>
                            <Input
                                id="delete-password"
                                type="password"
                                autoComplete="current-password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                            />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Anuluj</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    // Keep the dialog open so a wrong password can be corrected.
                                    e.preventDefault();
                                    handleDelete();
                                }}
                                disabled={!deletePassword || deleteAccount.isPending}
                                className={"bg-red-500 hover:bg-red-600"}
                            >
                                Usuń konto
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}

function SettingsTab() {
    const {settings, updateSettings} = useSettings();

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-4">Ustawienia gry</h3>
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base">Widoczne nazwy nieodkrytych Pokémon</Label>
                        <p className="text-sm text-muted-foreground">
                            Pokazuj nazwy Pokémon, których jeszcze nie złapałeś
                        </p>
                    </div>
                    <Switch
                        checked={settings.showHiddenPokemonNames}
                        onCheckedChange={(value) => updateSettings({showHiddenPokemonNames: value})}
                    />
                </div>
            </div>
        </div>
    );
}

export default function UserMenu() {
    const {data: account} = useSession();
    const logout = useLogout();
    const router = useRouter();
    const isMobile = useIsMobile();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("profile");

    function goToLogin() {
        router.replace("/login");
        router.refresh();
    }

    function openDialog(tab: string) {
        setActiveTab(tab);
        setIsDialogOpen(true);
    }

    if (!account) return null;

    return (
        <>
            {!isMobile && <span>Witaj, {account.username}</span>}
            <DropdownMenu>
                <DropdownMenuTrigger className={"rounded-full cursor-pointer"} aria-label="Menu użytkownika">
                    <UserAvatar account={account} avatar={account.avatar} />
                </DropdownMenuTrigger>
                <DropdownMenuContent className={"mr-6"}>
                    <DropdownMenuItem onClick={() => openDialog("profile")}>
                        <User /> Profil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDialog("settings")}>
                        <Settings /> Ustawienia
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => logout.mutate(undefined, {onSettled: goToLogin})}
                        variant={"destructive"}
                    >
                        <LogOut /> Wyloguj
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] w-full max-h-[90svh] overflow-y-scroll">
                    <DialogHeader>
                        <DialogTitle>{activeTab === "profile" ? "Profil użytkownika" : "Ustawienia"}</DialogTitle>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 gap-2">
                            <TabsTrigger value="profile" className={"cursor-pointer"}>
                                Profil
                            </TabsTrigger>
                            <TabsTrigger value="settings" className={"cursor-pointer"}>
                                Ustawienia
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="profile" className="space-y-6 mt-6">
                            <ProfileTab account={account} onDeleted={goToLogin} />
                        </TabsContent>

                        <TabsContent value="settings" className="space-y-6 mt-6">
                            <SettingsTab />
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </>
    );
}
