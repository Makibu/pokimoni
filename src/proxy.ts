import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";

export function proxy(req: NextRequest) {
    const token = req.cookies.get("auth_token")?.value;
    const url = req.nextUrl.pathname;

    const publicPaths = ["/login"];

    if (!token && !publicPaths.some((path) => url.startsWith(path))) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
