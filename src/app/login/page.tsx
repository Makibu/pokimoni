"use client";

import React, {useState} from "react";
import {useRouter} from "next/navigation";
import Image from "next/image";

import PokemonBackground from "@public/pokemon-background.jpg";
import {Card, CardHeader, CardTitle} from "@/components/ui/card";
import {toast} from "sonner";
import RegisterForm from "@/components/forms/RegisterForm";
import LoginForm from "@/components/forms/LoginForm";
import {useLogin, useRegister} from "@/features/account/use-session";
import {registerSchema} from "@/lib/validation/account";

export default function LoginPage() {
    const router = useRouter();
    const login = useLogin();
    const register = useRegister();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [username, setUsername] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");

    const [activeTab, setActiveTab] = useState("login");

    function enterGame(message: string) {
        toast.success(message);
        router.replace("/");
        router.refresh();
    }

    function handleLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        login.mutate(
            {email, password},
            {
                onSuccess: () => enterGame("Zalogowano pomyślnie!"),
                onError: (error) => toast.error(error.message),
            },
        );
    }

    function handleRegister(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const input = registerSchema.safeParse({username, email: regEmail, password: regPassword});
        if (!input.success) {
            toast.error(input.error.issues[0].message);
            return;
        }
        register.mutate(input.data, {
            onSuccess: () => enterGame("Zarejestrowano pomyślnie!"),
            onError: (error) => toast.error(error.message),
        });
    }

    return (
        <>
            <Image
                src={PokemonBackground}
                alt="pokemon-background"
                fill
                className="absolute object-cover w-full h-full"
                priority
            />
            <div className="w-full h-full flex justify-center items-center absolute px-4">
                <Card className="w-full max-w-sm bg-white/75 backdrop-blur-md shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl text-purple-500">
                            {activeTab === "login" ? "Logowanie" : "Rejestracja"}
                        </CardTitle>
                    </CardHeader>

                    {activeTab === "login" ? (
                        <LoginForm
                            email={email}
                            setEmail={setEmail}
                            password={password}
                            setPassword={setPassword}
                            loading={login.isPending}
                            onSubmit={handleLogin}
                            onSwitchTab={() => setActiveTab("register")}
                        />
                    ) : (
                        <RegisterForm
                            email={regEmail}
                            setEmail={setRegEmail}
                            username={username}
                            setUsername={setUsername}
                            password={regPassword}
                            setPassword={setRegPassword}
                            loading={register.isPending}
                            onSubmit={handleRegister}
                            onSwitchTab={() => setActiveTab("login")}
                        />
                    )}
                </Card>
            </div>
        </>
    );
}
