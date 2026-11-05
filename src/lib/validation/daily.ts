import "./zod-config";
import {z} from "zod";

const MAX_ANSWER_LENGTH = 60;
const MAX_TABLE_SIZE = 25;
/** The client sends moves in small batches; far more than a player can make between two requests. */
const MAX_MOVES_PER_REQUEST = 200;

export const questSlotSchema = z.coerce.number().int().min(1).max(3);

export const minigameActionSchema = z.discriminatedUnion("type", [
    z.object({type: z.literal("answer"), answer: z.string().trim().min(1).max(MAX_ANSWER_LENGTH)}),
    z.object({type: z.literal("flip"), position: z.number().int().min(0).max(MAX_TABLE_SIZE)}),
    z.object({
        type: z.literal("moves"),
        cells: z.array(z.number().int().min(0).max(MAX_TABLE_SIZE)).min(1).max(MAX_MOVES_PER_REQUEST),
    }),
]);
