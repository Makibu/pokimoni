"use client";

import {useAuth} from "@/context/authContext";
import React, {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import Image from "next/image";

import PokemonBackground from "@public/pokemon-background.jpg";
import {Card, CardHeader, CardTitle} from "@/components/ui/card";
import {toast} from "sonner";
import RegisterForm from "@/components/forms/RegisterForm";
import LoginForm from "@/components/forms/LoginForm";

export default function LoginPage() {
    const {user, signIn, signUp} = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [username, setUsername] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");

    const [activeTab, setActiveTab] = useState("login");
    const [loadingLogin, setLoadingLogin] = useState(false);
    const [loadingRegister, setLoadingRegister] = useState(false);

    useEffect(() => {
        if (user) {
            router.replace("/");
        }
    }, [user, router]);

    async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoadingLogin(true);
        try {
            await signIn(email, password);
            toast.success("Zalogowano pomyślnie!");
        } catch (err: unknown) {
            if (err instanceof Error) {
                toast.error(err.message);
            } else {
                toast.error("Wystąpił nieoczekiwany błąd");
            }
        } finally {
            setLoadingLogin(false);
        }
    }

    async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoadingRegister(true);
        try {
            await signUp(username, regEmail, regPassword);
            toast.success("Zarejestrowano pomyślnie!");
        } catch (err: unknown) {
            if (err instanceof Error) {
                toast.error(err.message);
            } else {
                toast.error("Wystąpił nieoczekiwany błąd");
            }
        } finally {
            setLoadingRegister(false);
        }
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
                            loading={loadingLogin}
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
                            loading={loadingRegister}
                            onSubmit={handleRegister}
                            onSwitchTab={() => setActiveTab("login")}
                        />
                    )}
                </Card>
            </div>
        </>
    );
}
