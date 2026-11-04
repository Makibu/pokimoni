"use client";

import {useRouter} from "next/navigation";
import React, {useState} from "react";
import {toast} from "sonner";
import LoginForm from "@/components/forms/LoginForm";
import RegisterForm from "@/components/forms/RegisterForm";
import {useLogin, useRegister} from "@/features/account/use-session";
import {registerSchema} from "@/lib/validation/account";

function DecorativeCard({className, field, shape}: {className: string; field: string; shape: string}) {
    return (
        <div
            aria-hidden="true"
            className={`holo-rim aspect-[245/342] w-40 rounded-[20px] p-[5px] xl:w-48 ${className}`}
        >
            <div className="flex size-full flex-col gap-2 rounded-[15px] bg-white p-2.5">
                <div className={`flex flex-1 items-center justify-center rounded-[10px] ${field}`}>
                    <div className={`aspect-square w-3/5 rounded-[50%_50%_44%_56%] ${shape}`} />
                </div>
                <div className="h-2.5 w-3/5 rounded-full bg-[#ede9ff]" />
            </div>
        </div>
    );
}

export default function LoginPage() {
    const router = useRouter();
    const login = useLogin();
    const register = useRegister();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [username, setUsername] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");

    const [activeTab, setActiveTab] = useState<"login" | "register">("login");

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
        <main className="flex min-h-svh flex-col gap-4 p-3 md:p-5 lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-6">
            <section className="relative overflow-hidden rounded-stage bg-lilac px-6 py-7 md:px-10 md:py-10 lg:flex lg:flex-col lg:justify-between lg:p-14">
                <div
                    aria-hidden="true"
                    className="absolute -top-28 -right-20 size-72 rounded-full bg-pink lg:size-[28rem]"
                />
                <div
                    aria-hidden="true"
                    className="absolute -bottom-24 -left-16 size-56 rounded-full bg-aqua lg:size-96"
                />
                <div className="relative flex flex-col gap-2 lg:gap-4">
                    <h1 className="font-display text-3xl font-bold text-accent-ink lg:text-5xl">pokimoni</h1>
                    <p className="max-w-md text-base font-medium lg:text-xl">
                        Otwieraj paczki, zbieraj karty i pozwól im zarabiać monety.
                    </p>
                </div>
                <div className="relative mt-10 hidden justify-center gap-6 lg:flex">
                    <DecorativeCard className="-rotate-3" field="bg-[#fff0bf]" shape="bg-[#ff8a5c]" />
                    <DecorativeCard className="translate-y-6 rotate-2" field="bg-[#cff5ef]" shape="bg-[#19b8b2]" />
                </div>
            </section>

            <section className="flex flex-1 items-start justify-center lg:items-center">
                <div className="flex w-full max-w-sm flex-col gap-6 rounded-section bg-card p-6 md:p-8">
                    <h2 className="font-display text-xl font-bold">
                        {activeTab === "login" ? "Logowanie" : "Rejestracja"}
                    </h2>

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
                </div>
            </section>
        </main>
    );
}
