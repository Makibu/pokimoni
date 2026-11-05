"use client";

import {Monitor, Moon, Sun, Trash2} from "lucide-react";
import Image from "next/image";
import {useTheme} from "next-themes";
import {useState} from "react";
import {toast} from "sonner";
import UserAvatar from "@/components/layout/UserAvatar";
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
import {Button, buttonVariants} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Separator} from "@/components/ui/separator";
import {Switch} from "@/components/ui/switch";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {useDeleteAccount, useUpdateAccount} from "@/features/account/use-session";
import {useSettings} from "@/features/settings/use-settings";
import {cn} from "@/lib/utils";
import {updateAccountSchema, type Account, type UpdateAccountInput} from "@/lib/validation/account";

export type AccountTab = "profile" | "settings";

const AVATARS = [1, 2, 3, 4, 5, 6, 7];

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
                toast.success("Konto zaktualizowane");
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
        <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
                <UserAvatar username={account.username} avatar={selectedAvatar} size={72} />
                <div className="min-w-0">
                    <p className="font-display truncate font-bold">{account.username}</p>
                    <p className="text-sm text-muted-foreground">Użytkownik</p>
                </div>
            </div>

            <Separator />

            <fieldset className="flex flex-col gap-3">
                <legend className="mb-3 text-sm font-bold">Avatar</legend>
                <div className="flex flex-wrap gap-2">
                    {AVATARS.map((num) => (
                        <button
                            key={num}
                            type="button"
                            onClick={() => setSelectedAvatar(num)}
                            aria-label={`Avatar ${num}`}
                            aria-pressed={selectedAvatar === num}
                            className={cn(
                                "rounded-full p-1 transition-colors",
                                selectedAvatar === num ? "bg-primary" : "hover:bg-accent",
                            )}
                        >
                            <Image
                                src={`/avatars/avatar-${num}.webp`}
                                alt=""
                                width={48}
                                height={48}
                                className="size-12 rounded-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            </fieldset>

            <Separator />

            <div className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="profile-username">Nazwa użytkownika</Label>
                    <Input
                        id="profile-username"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input
                        id="profile-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
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

            <div className="flex flex-wrap justify-between gap-3 pt-2">
                <Button onClick={handleSave} disabled={updateAccount.isPending}>
                    Zapisz zmiany
                </Button>

                <AlertDialog onOpenChange={() => setDeletePassword("")}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 aria-hidden="true" />
                            Usuń konto
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-destructive">Trwałe usunięcie konta</AlertDialogTitle>
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
                                className={buttonVariants({variant: "destructive"})}
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

const THEMES = [
    {value: "light", label: "Jasny", icon: Sun},
    {value: "dark", label: "Ciemny", icon: Moon},
    {value: "system", label: "Systemowy", icon: Monitor},
];

function SettingsTab() {
    const {settings, updateSettings} = useSettings();
    const {theme, setTheme} = useTheme();

    return (
        <div className="flex flex-col gap-6">
            <fieldset>
                <legend className="mb-3 text-sm font-bold">Motyw</legend>
                <div className="grid grid-cols-3 gap-2">
                    {THEMES.map(({value, label, icon: Icon}) => (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={theme === value}
                            onClick={() => setTheme(value)}
                            className={cn(
                                "flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg text-sm font-bold transition-colors",
                                theme === value
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-foreground hover:bg-accent",
                            )}
                        >
                            <Icon aria-hidden="true" className="size-5" />
                            {label}
                        </button>
                    ))}
                </div>
            </fieldset>

            <Separator />

            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <Label htmlFor="show-hidden-names" className="text-sm font-bold">
                        Widoczne nazwy nieodkrytych Pokémon
                    </Label>
                    <p className="text-sm text-muted-foreground">Pokazuj nazwy Pokémon, których jeszcze nie złapałeś</p>
                </div>
                <Switch
                    id="show-hidden-names"
                    checked={settings.showHiddenPokemonNames}
                    onCheckedChange={(value) => updateSettings({showHiddenPokemonNames: value})}
                />
            </div>
        </div>
    );
}

type AccountDialogProps = {
    account: Account;
    tab: AccountTab;
    onTabChange: (tab: AccountTab) => void;
    onClose: () => void;
    onDeleted: () => void;
};

export default function AccountDialog({account, tab, onTabChange, onClose, onDeleted}: AccountDialogProps) {
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[560px]" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{tab === "profile" ? "Konto" : "Ustawienia"}</DialogTitle>
                </DialogHeader>

                <Tabs value={tab} onValueChange={(value) => onTabChange(value as AccountTab)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="profile">Konto</TabsTrigger>
                        <TabsTrigger value="settings">Ustawienia</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="mt-4">
                        <ProfileTab account={account} onDeleted={onDeleted} />
                    </TabsContent>

                    <TabsContent value="settings" className="mt-4">
                        <SettingsTab />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
