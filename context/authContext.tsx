'use client'

import {createContext, useContext, useEffect, useState} from 'react'
import {User} from "@/lib/types";

type UserSettings = {
    showHiddenPokemonNames: boolean
    darkMode: boolean
}

type AuthContextType = {
    user: User | null
    token: string | null
    settings: UserSettings
    setSettings: React.Dispatch<React.SetStateAction<UserSettings>>
    signIn: (email: string, password: string) => Promise<void>
    signUp: (username: string, email: string, password: string) => Promise<void>
    signOut: () => void
    updateUser: (data: {
        username?: string;
        email?: string;
        password?: string;
        avatar?: number | null
    }) => Promise<void>
    loading: boolean
}

const defaultSettings: UserSettings = {
    showHiddenPokemonNames: false,
    darkMode: false,
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({children}: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [uid, setUid] = useState<string | null>(null)

    const [settings, setSettings] = useState<UserSettings>(defaultSettings)

    useEffect(() => {
        const saved = localStorage.getItem("user_settings");
        if (saved) {
            setSettings(JSON.parse(saved));
        }
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        setUid(user.uid)
    }, []);

    useEffect(() => {
        localStorage.setItem('user_settings', JSON.stringify(settings));
    }, [settings]);

    const signIn = async (email: string, password: string) => {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email, password}),
        })

        if (!res.ok) {
            const {error} = await res.json()
            throw new Error(error)
        }

        const {user, token} = await res.json()
        setUser(user)
        setToken(token)
        localStorage.setItem('auth_token', token)
        localStorage.setItem('user', JSON.stringify(user))
        document.cookie = `auth_token=${token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`
    }

    const signUp = async (username: string, email: string, password: string) => {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, email, password}),
        })

        if (!res.ok) {
            const {error} = await res.json()
            throw new Error(error)
        }

        await signIn(email, password)
    }

    const signOut = () => {
        setUser(null)
        setToken(null)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        document.cookie = `auth_token=; path=/; max-age=0; SameSite=Lax`
        window.location.href = "/login"
    }

    const updateUser = async (data: {
        username?: string;
        email?: string;
        password?: string;
        avatar?: number | null
    }) => {
        const res = await fetch(`/api/user/update?uid=${uid}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const {error} = await res.json();
            throw new Error(error || "Błąd przy aktualizacji użytkownika");
        }

        const updatedUser = await res.json();
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
    };

    useEffect(() => {
        const savedToken = localStorage.getItem('auth_token')
        const savedUser = localStorage.getItem('user')
        if (savedToken && savedUser) {
            setToken(savedToken)
            setUser(JSON.parse(savedUser))
        }
        setLoading(false)
    }, [])

    return (
        <AuthContext.Provider
            value={{user, token, settings, setSettings, signIn, signUp, signOut, updateUser, loading}}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
