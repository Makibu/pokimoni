import {jwtVerify, SignJWT} from "jose";

export const SESSION_COOKIE = "session";
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export type SessionClaims = {userId: string; tokenVersion: number};

function secretKey(): Uint8Array {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters long");
    return new TextEncoder().encode(secret);
}

export function createSessionToken({userId, tokenVersion}: SessionClaims): Promise<string> {
    return new SignJWT({ver: tokenVersion})
        .setProtectedHeader({alg: "HS256"})
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
        .sign(secretKey());
}

/** Returns the claims of a validly signed, unexpired token, otherwise null. */
export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
    try {
        const {payload} = await jwtVerify(token, secretKey(), {algorithms: ["HS256"]});
        if (typeof payload.sub !== "string" || typeof payload.ver !== "number") return null;
        return {userId: payload.sub, tokenVersion: payload.ver};
    } catch {
        return null;
    }
}
