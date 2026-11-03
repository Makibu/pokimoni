"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {ApiError, apiFetch} from "@/lib/api-client";
import {queryKeys} from "@/lib/query-keys";
import type {Account, LoginInput, RegisterInput, UpdateAccountInput} from "@/lib/validation/account";

/** The signed-in account; `null` means the session cookie is missing or no longer valid. */
export function useSession() {
    return useQuery<Account | null>({
        queryKey: queryKeys.session,
        queryFn: async () => {
            try {
                return await apiFetch<Account>("/api/auth/me");
            } catch (error) {
                if (error instanceof ApiError && error.status === 401) return null;
                throw error;
            }
        },
    });
}

function useAccountMutation<Input>(request: (input: Input) => Promise<Account>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: request,
        onSuccess: (account) => queryClient.setQueryData(queryKeys.session, account),
    });
}

export function useLogin() {
    return useAccountMutation((input: LoginInput) =>
        apiFetch<Account>("/api/auth/login", {method: "POST", body: input}),
    );
}

export function useRegister() {
    return useAccountMutation((input: RegisterInput) =>
        apiFetch<Account>("/api/auth/register", {method: "POST", body: input}),
    );
}

export function useUpdateAccount() {
    return useAccountMutation((input: UpdateAccountInput) =>
        apiFetch<Account>("/api/auth/me", {method: "PATCH", body: input}),
    );
}

/** Clears the session and cached player data; the caller navigates to the login page. */
export function useLogout() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => apiFetch("/api/auth/logout", {method: "POST"}),
        onSuccess: () => queryClient.clear(),
    });
}

export function useDeleteAccount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (password: string) => apiFetch("/api/auth/me", {method: "DELETE", body: {password}}),
        onSuccess: () => queryClient.clear(),
    });
}
