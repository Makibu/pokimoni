import {CardContent, CardDescription, CardFooter} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import React, {FormEvent} from "react";

type LoginFormProps = {
    email: string,
    setEmail: (email: string) => void,
    password: string,
    setPassword: (password: string) => void,
    loading: boolean,
    onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>,
    onSwitchTab: () => void,
}

export default function LoginForm({
                                      email,
                                      setEmail,
                                      password,
                                      setPassword,
                                      loading,
                                      onSubmit,
                                      onSwitchTab
                                  }: LoginFormProps) {
    return (
        <form onSubmit={onSubmit} className={'grid gap-6'}>
            <CardContent>
                <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="m@example.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="password">Hasło</Label>
                            <a
                                href="#"
                                className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                            >
                                Zapomniałeś hasła?
                            </a>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
                <Button type="submit"
                        className="w-full"
                        disabled={loading}
                >
                    {loading ? "Logowanie..." : "Zaloguj"}
                </Button>
                <CardDescription>
                    Nie masz jeszcze konta?{" "}
                    <button
                        type="button"
                        onClick={onSwitchTab}
                        className="cursor-pointer text-purple-500 hover:underline"
                    >
                        Stwórz konto!
                    </button>
                </CardDescription>
            </CardFooter>
        </form>
    )
}