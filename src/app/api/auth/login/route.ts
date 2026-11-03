import {NextResponse} from "next/server";
import {loginSchema} from "@/lib/validation/account";
import {getDb} from "@/server/db/client";
import {clientIp, parseBody, route, setSessionCookie} from "@/server/http/handler";
import {loginAccount} from "@/server/services/account";

export const POST = route(async (req) => {
    const input = await parseBody(req, loginSchema);
    const session = await loginAccount(getDb(), input, clientIp(req));
    const res = NextResponse.json(session.account);
    await setSessionCookie(res, session);
    return res;
});
