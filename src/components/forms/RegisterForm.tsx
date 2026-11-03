import {CardContent, CardDescription, CardFooter} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import React, {FormEvent} from "react";

type RegisterFormProps = {
    username: string;
    setUsername: (username: string) => void;
    email: string;
    setEmail: (email: string) => void;
    password: string;
    setPassword: (password: string) => void;
    loading: boolean;
    onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
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
        <form onSubmit={onSubmit} className={"grid gap-6"}>
            <CardContent>
                <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="username">Nazwa użytkownika</Label>
                        <Input
                            id="username"
                            type="text"
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
                            placeholder="m@example.com"
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
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Rejestracja..." : "Zarejestruj"}
                </Button>
                <CardDescription>
                    Masz już konto?{" "}
                    <button
                        type="button"
                        onClick={onSwitchTab}
                        className="cursor-pointer text-purple-500 hover:underline"
                    >
                        Zaloguj się!
                    </button>
                </CardDescription>
            </CardFooter>
        </form>
    );
}
