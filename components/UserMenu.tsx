"use client"

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
import {useAuth} from "@/context/authContext";
import {useIsMobile} from "@/hooks/useIsMobile";
import {useEffect, useState} from "react";
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
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";

export default function UserMenu() {
    const {user, signOut, updateUser, settings, setSettings} = useAuth()
    const isMobile = useIsMobile()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [activeTab, setActiveTab] = useState("profile")
    const [confirmStep, setConfirmStep] = useState(false);

    const [username, setUsername] = useState(user?.username || "");
    const [email, setEmail] = useState(user?.email || "");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [uid, setUid] = useState<string | null>(null)

    useEffect(() => {
        const uid = JSON.parse(localStorage.getItem('user') || '{}').uid;
        setUid(uid);
    }, []);

    useEffect(() => {
        setUsername(user?.username || "");
        setEmail(user?.email || "");
    }, [user]);

    const handleProfileClick = () => {
        setActiveTab("profile")
        setIsDialogOpen(true)
    }

    const handleSettingsClick = () => {
        setActiveTab("settings")
        setIsDialogOpen(true)
    }

    const handleSaveProfile = async () => {
        if (password && password !== confirmPassword) {
            toast.error("Hasła nie są takie same!!!")
            return;
        }

        try {
            await updateUser({username, email, password: password || undefined});
            toast.success("Profil zaktualizowany pomyślnie!");
            setPassword("");
            setConfirmPassword("");
        } catch {
            toast.error("Wystąpił błąd przy aktualizacji profilu");
        }
    }

    const handleDeleteConfirm = async () => {
        try {
            await fetch(`/api/user/update?uid=${uid}`, {
                method: "DELETE",
            });

            toast.success("Konto zostało trwale usunięte");
            signOut();
        } catch {
            toast.error("Operacja nie powiodła się.");
        }
    };

    return (
        <>
            {!isMobile && (<span>Witaj, {user?.username}</span>)}
            <DropdownMenu>
                <DropdownMenuTrigger className={'rounded-full cursor-pointer'}>
                    <Avatar>
                        <AvatarImage/>
                        <AvatarFallback>{user?.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className={'mr-6'}>
                    <DropdownMenuItem onClick={handleProfileClick}>
                        <User/> Profil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSettingsClick}>
                        <Settings/> Ustawienia
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={signOut} variant={'destructive'}>
                        <LogOut/> Wyloguj
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] w-full">
                    <DialogHeader>
                        <DialogTitle>{activeTab === "profile" ? "Profil użytkownika" : "Ustawienia"}</DialogTitle>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 gap-2">
                            <TabsTrigger value="profile" className={'cursor-pointer'}>Profil</TabsTrigger>
                            <TabsTrigger value="settings" className={'cursor-pointer'}>Ustawienia</TabsTrigger>
                        </TabsList>

                        <TabsContent value="profile" className="space-y-6 mt-6">
                            <div className="space-y-4">
                                <div className="flex items-center space-x-4">
                                    <Avatar className="h-20 w-20">
                                        <AvatarImage alt="Avatar użytkownika"/>
                                        <AvatarFallback className="bg-blue-500 text-white text-xl">PU</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="text-lg font-semibold">{user?.username}</h3>
                                        <p className="text-sm text-muted-foreground">Użytkownik</p>
                                    </div>
                                </div>

                                <Separator/>

                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="username">Nazwa użytkownika</Label>
                                        <Input id="username" value={username}
                                               onChange={(e) => setUsername(e.target.value)}/>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" value={email}
                                               onChange={(e) => setEmail(e.target.value)}/>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="password">Nowe hasło</Label>
                                        <Input id="password" type="password" placeholder="Wprowadź nowe hasło"
                                               value={password} onChange={(e) => setPassword(e.target.value)}/>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="confirm-password">Potwierdź hasło</Label>
                                        <Input id="confirm-password" type="password"
                                               placeholder="Potwierdź nowe hasło" value={confirmPassword}
                                               onChange={(e) => setConfirmPassword(e.target.value)}/>
                                    </div>
                                </div>

                                <div className="flex justify-between pt-4">
                                    <Button onClick={handleSaveProfile}>Zapisz zmiany</Button>

                                    {!confirmStep ? (
                                        <Button
                                            variant="destructive"
                                            className="flex items-center gap-2"
                                            onClick={() => setConfirmStep(true)}
                                        >
                                            <Trash2 className="h-4 w-4"/>
                                            Usuń konto
                                        </Button>
                                    ) : (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" className="flex items-center gap-2">
                                                    <Trash2 className="h-4 w-4"/>
                                                    Na pewno?
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className={'text-red-500 font-bold'}>Trwałe
                                                        usunięcie
                                                        konta</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        To spowoduje trwałe usunięcie Twojego konta oraz wszystkich
                                                        danych. Operacji nie będzie można cofnąć.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel
                                                        onClick={() => setConfirmStep(false)}>Anuluj</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleDeleteConfirm}
                                                                       className={'bg-red-500 hover:bg-red-600'}>
                                                        Usuń konto
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="settings" className="space-y-6 mt-6">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Ustawienia gry</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-base">Widoczne nazwy nieodkrytych Pokémon</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Pokazuj nazwy Pokémon, których jeszcze nie złapałeś
                                                </p>
                                            </div>
                                            <Switch checked={settings.showHiddenPokemonNames}
                                                    onCheckedChange={(value) => setSettings(prev => ({
                                                        ...prev,
                                                        showHiddenPokemonNames: value
                                                    }))}/>
                                        </div>
                                    </div>
                                </div>

                                <Separator/>

                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Ustawienia interfejsu</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-base">Tryb ciemny</Label>
                                                <p className="text-sm text-muted-foreground">Przełącz na ciemny motyw
                                                    interfejsu</p>
                                            </div>
                                            <Switch checked={settings.darkMode}
                                                    onCheckedChange={(value) => setSettings(prev => ({
                                                        ...prev,
                                                        darkMode: value
                                                    }))}/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </>
    )
}