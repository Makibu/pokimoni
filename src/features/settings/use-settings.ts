"use client";

import {useCallback, useSyncExternalStore} from "react";

export type UserSettings = {
    showHiddenPokemonNames: boolean;
};

const STORAGE_KEY = "user_settings";
const DEFAULT_SETTINGS: UserSettings = {showHiddenPokemonNames: false};

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedSettings = DEFAULT_SETTINGS;

function readSettings(): UserSettings {
    let raw: string | null = null;
    try {
        raw = localStorage.getItem(STORAGE_KEY);
    } catch {
        return DEFAULT_SETTINGS;
    }
    if (raw !== cachedRaw) {
        cachedRaw = raw;
        try {
            cachedSettings = {...DEFAULT_SETTINGS, ...(raw ? (JSON.parse(raw) as Partial<UserSettings>) : {})};
        } catch {
            cachedSettings = DEFAULT_SETTINGS;
        }
    }
    return cachedSettings;
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
    };
}

/** Per-device display settings kept in localStorage. */
export function useSettings() {
    const settings = useSyncExternalStore(subscribe, readSettings, () => DEFAULT_SETTINGS);
    const updateSettings = useCallback((changes: Partial<UserSettings>) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({...readSettings(), ...changes}));
        } catch {
            return;
        }
        listeners.forEach((listener) => listener());
    }, []);
    return {settings, updateSettings};
}
