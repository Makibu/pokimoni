import "./zod-config";
import {z} from "zod";
import {MAX_PROFILE_STATS, MAX_SHOWCASE_CARDS, PROFILE_STATS} from "@/domain/profile";
import {usernameSchema} from "./account";

const cardIdSchema = z.string().min(1).max(50);
const hasNoDuplicates = (values: string[]) => new Set(values).size === values.length;

export const playerIdSchema = z.uuid("Nie znaleziono gracza");

export const recordIdSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export const friendRequestSchema = z.object({username: usernameSchema});

export const playerSearchSchema = z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_]{2,20}$/, "Wpisz co najmniej 2 znaki nicku: litery, cyfry lub podkreślenie");

export const markReadSchema = z.object({upToId: recordIdSchema});

export const createTradeSchema = z.object({
    toUserId: playerIdSchema,
    offeredCardId: cardIdSchema,
    requestedCardId: cardIdSchema,
});

export const updateProfileSchema = z.object({
    stats: z
        .array(z.enum(PROFILE_STATS))
        .min(1, "Wybierz co najmniej jedną statystykę")
        .max(MAX_PROFILE_STATS, `Możesz wybrać najwyżej ${MAX_PROFILE_STATS} statystyki`)
        .refine(hasNoDuplicates, "Każdą statystykę można wybrać raz"),
    showcase: z
        .array(cardIdSchema)
        .max(MAX_SHOWCASE_CARDS, `Gablota mieści najwyżej ${MAX_SHOWCASE_CARDS} kart`)
        .refine(hasNoDuplicates, "Każda karta może być w gablocie raz"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateTradeInput = z.infer<typeof createTradeSchema>;
