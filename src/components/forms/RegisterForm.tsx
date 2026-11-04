import React, {FormEvent} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";

type RegisterFormProps = {
    username: string;
    setUsername: (username: string) => void;
    email: string;
    setEmail: (email: string) => void;
    password: string;
    setPassword: (password: string) => void;
    loading: boolean;
    onSubmit: (e: FormEvent<HTMLFormElement>) => void;
    onSwitchTab: () => void;
};

export default function RegisterForm({
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    onSubmit,
    onSwitchTab,
}: RegisterFormProps) {
    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="grid gap-2">
                <Label htmlFor="username">Nazwa użytkownika</Label>
                <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="PokemonTrainer"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="regEmail">Email</Label>
                <Input
                    id="regEmail"
                    type="email"
                    autoComplete="email"
                    placeholder="ty@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="regPassword">Hasło</Label>
                <Input
                    id="regPassword"
                    type="password"
                    autoComplete="new-password"
                    aria-describedby="regPasswordHint"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <p id="regPasswordHint" className="text-sm text-muted-foreground">
                    Co najmniej 8 znaków.
                </p>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Rejestracja..." : "Zarejestruj"}
            </Button>
            <p className="flex flex-wrap items-center justify-center gap-x-1 text-sm text-muted-foreground">
                Masz już konto?
                <Button type="button" variant="link" size="sm" className="px-1" onClick={onSwitchTab}>
                    Zaloguj się!
                </Button>
            </p>
        </form>
    );
}
