import "./zod-config";
import {z} from "zod";

export const openPackSchema = z.object({
    setId: z.string().min(1).max(50),
    source: z.enum(["shop", "daily_pack", "voucher"]),
});

export const setSlotSchema = z.object({
    cardId: z.string().min(1).max(50).nullable(),
});

export const feedbackSchema = z.object({
    description: z
        .string()
        .trim()
        .min(1, "Opisz swój pomysł lub błąd")
        .max(2000, "Wiadomość może mieć najwyżej 2000 znaków"),
});
