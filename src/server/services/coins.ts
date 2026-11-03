import {and, eq, gte, sql} from "drizzle-orm";
import {coinLedger, coinReasonEnum, playerState} from "@/server/db/schema";
import type {Tx} from "@/server/db/types";
import {AppError} from "@/server/http/errors";

type CoinReason = (typeof coinReasonEnum.enumValues)[number];

/** Atomically changes the balance and records it in the ledger. Fails if the balance would go below zero. */
export async function changeCoins(tx: Tx, userId: string, amount: number, reason: CoinReason, refId?: string) {
    const [updated] = await tx
        .update(playerState)
        .set({coins: sql`${playerState.coins} + ${amount}`})
        .where(and(eq(playerState.userId, userId), gte(sql`${playerState.coins} + ${amount}`, 0)))
        .returning({coins: playerState.coins});
    if (!updated) throw new AppError(409, "not_enough_coins", "Masz za mało monet");
    await tx.insert(coinLedger).values({userId, amount, reason, refId});
    return updated.coins;
}
