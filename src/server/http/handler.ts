import {type NextRequest, NextResponse} from "next/server";
import {z, ZodError} from "zod";
import type {Account} from "@/lib/validation/account";
import {createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS, verifySessionToken} from "@/server/auth/token";
import type {Db} from "@/server/db/types";
import {getSessionUser} from "@/server/services/account";
import {AppError} from "./errors";

export type ApiErrorBody = {error: {code: string; message: string}};

function errorResponse(status: number, code: string, message: string) {
    return NextResponse.json<ApiErrorBody>({error: {code, message}}, {status});
}

/** Rejects state-changing requests sent from another site (CSRF protection on top of SameSite cookies). */
function assertSameOrigin(req: NextRequest) {
    if (req.method === "GET" || req.method === "HEAD") return;
    const origin = req.headers.get("origin");
    if (!origin) return;
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (new URL(origin).host !== host) throw new AppError(403, "forbidden_origin", "Niedozwolone żądanie");
}

/** Wraps a route handler: same-origin check and uniform error responses without internal details. */
export function route<Context = unknown>(handler: (req: NextRequest, context: Context) => Promise<NextResponse>) {
    return async (req: NextRequest, context: Context): Promise<NextResponse> => {
        try {
            assertSameOrigin(req);
            return await handler(req, context);
        } catch (error) {
            if (error instanceof AppError) return errorResponse(error.status, error.code, error.message);
            if (error instanceof ZodError) {
                return errorResponse(400, "invalid_input", error.issues[0]?.message ?? "Niepoprawne dane");
            }
            console.error(error);
            return errorResponse(500, "internal_error", "Coś poszło nie tak. Spróbuj ponownie później");
        }
    };
}

export async function parseBody<Schema extends z.ZodType>(req: NextRequest, schema: Schema): Promise<z.infer<Schema>> {
    if (!req.headers.get("content-type")?.includes("application/json")) {
        throw new AppError(415, "unsupported_media_type", "Oczekiwano danych JSON");
    }
    const body: unknown = await req.json().catch(() => {
        throw new AppError(400, "invalid_input", "Niepoprawne dane");
    });
    return schema.parse(body);
}

/** Authenticates the request from its session cookie. The player id never comes from client input. */
export async function requireUser(db: Db, req: NextRequest): Promise<Account> {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const claims = token ? await verifySessionToken(token) : null;
    const account = claims ? await getSessionUser(db, claims.userId, claims.tokenVersion) : null;
    if (!account) throw new AppError(401, "unauthenticated", "Sesja wygasła. Zaloguj się ponownie");
    return account;
}

const baseCookie = {
    name: SESSION_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
} as const;

export async function setSessionCookie(res: NextResponse, session: {account: Account; tokenVersion: number}) {
    const value = await createSessionToken({userId: session.account.id, tokenVersion: session.tokenVersion});
    res.cookies.set({...baseCookie, value, maxAge: SESSION_TTL_SECONDS});
}

export function clearSessionCookie(res: NextResponse) {
    res.cookies.set({...baseCookie, value: "", maxAge: 0});
}

export function clientIp(req: NextRequest): string {
    return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
