import {MAX_CARD_COPIES} from "./economy";

/** Copies a player can still slot or offer: owned minus those in income slots and in their open offers. */
export function freeCopies(owned: number, slotted: number, escrowed: number): number {
    return Math.max(0, owned - slotted - escrowed);
}

export type ReceivedCopy = {quantity: number; lost: boolean};

/** The result of receiving one copy in a trade. A copy above the limit is lost, the trade still happens. */
export function receiveCopy(owned: number): ReceivedCopy {
    return owned >= MAX_CARD_COPIES ? {quantity: MAX_CARD_COPIES, lost: true} : {quantity: owned + 1, lost: false};
}

/** Friendships store each pair once, with the smaller id first. */
export function friendPair(a: string, b: string): {userA: string; userB: string} {
    return a < b ? {userA: a, userB: b} : {userA: b, userB: a};
}
