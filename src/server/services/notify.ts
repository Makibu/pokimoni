import {notifications, notificationTypeEnum} from "@/server/db/schema";
import type {Tx} from "@/server/db/types";

export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

export type NotificationPayload = {
    /** The player who caused it. Their notifications are removed when they delete their account. */
    actorId: string;
    requestId?: number;
    tradeId?: number;
    /** The sender already had the limit of copies, so the card from the accepted trade was lost. */
    lostCard?: boolean;
};

/** Part of the transaction it reports on, so a notification never appears for something that did not happen. */
export async function notify(tx: Tx, userId: string, type: NotificationType, payload: NotificationPayload) {
    await tx.insert(notifications).values({userId, type, payload});
}
