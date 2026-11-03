import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";
import {SESSION_COOKIE, verifySessionToken} from "@/server/auth/token";

const LOGIN_PATH = "/login";

/** Page-level gate only; every API route authenticates on its own with `requireUser`. */
export async function proxy(req: NextRequest) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const signedIn = token ? (await verifySessionToken(token)) !== null : false;
    const onLoginPage = req.nextUrl.pathname.startsWith(LOGIN_PATH);

    if (!signedIn && !onLoginPage) return NextResponse.redirect(new URL(LOGIN_PATH, req.url));
    if (signedIn && onLoginPage) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
}

export const config = {
    // Public files stay reachable: next/image fetches them without the session cookie.
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|webp|svg|json)$).*)"],
};
