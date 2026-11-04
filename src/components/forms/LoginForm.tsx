import React, {FormEvent} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";

type LoginFormProps = {
    email: string;
    setEmail: (email: string) => void;
    password: string;
    setPassword: (password: string) => void;
    loading: boolean;
    onSubmit: (e: FormEvent<HTMLFormElement>) => void;
    onSwitchTab: () => void;
};

export default function LoginForm({
    email,
    setEmail,
    password,
    setPassword,
    loading,
    onSubmit,
    onSwitchTab,
}: LoginFormProps) {
    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="ty@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="password">Hasło</Label>
                <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Logowanie..." : "Zaloguj"}
            </Button>
            <p className="flex flex-wrap items-center justify-center gap-x-1 text-sm text-muted-foreground">
                Nie masz jeszcze konta?
                <Button type="button" variant="link" size="sm" className="px-1" onClick={onSwitchTab}>
                    Stwórz konto!
                </Button>
            </p>
        </form>
    );
}
