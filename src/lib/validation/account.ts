import "./zod-config";
import {z} from "zod";

// Shared by API handlers and forms.

export const usernameSchema = z
    .string()
    .regex(/^[A-Za-z0-9_]{3,20}$/, "Nick musi mieć 3–20 znaków: litery, cyfry lub podkreślenie");

export const emailSchema = z.email("Podaj poprawny adres email").max(254, "Adres email jest za długi");

export const passwordSchema = z
    .string()
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    // bcrypt only uses the first 72 bytes of the input.
    .refine((value) => new TextEncoder().encode(value).length <= 72, "Hasło jest za długie");

export const avatarSchema = z.number().int().min(1).max(7);

export const registerSchema = z.object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
});

export const loginSchema = z.object({
    email: z.string().min(1).max(254),
    password: z.string().min(1).max(1000),
});

export const updateAccountSchema = z.object({
    username: usernameSchema.optional(),
    avatar: avatarSchema.nullable().optional(),
    email: emailSchema.optional(),
    newPassword: passwordSchema.optional(),
    currentPassword: z.string().max(1000).optional(),
});

export const deleteAccountSchema = z.object({
    password: z.string().min(1, "Podaj hasło").max(1000),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

/** Account data the client is allowed to see. */
export type Account = {
    id: string;
    username: string;
    email: string;
    avatar: number | null;
};
