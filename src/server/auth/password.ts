import bcrypt from "bcryptjs";

const COST = Number(process.env.BCRYPT_COST ?? 12);

export function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

let dummyHash: Promise<string> | undefined;

/** Spends the same time as a real check, so response timing does not reveal whether an email exists. */
export async function verifyAgainstDummy(password: string): Promise<void> {
    dummyHash ??= hashPassword("timing-equalizer");
    await verifyPassword(password, await dummyHash);
}
