import {NextResponse} from "next/server";
import {registerSchema} from "@/lib/validation/account";
import {getDb} from "@/server/db/client";
import {clientIp, parseBody, route, setSessionCookie} from "@/server/http/handler";
import {registerAccount} from "@/server/services/account";

export const POST = route(async (req) => {
    const input = await parseBody(req, registerSchema);
    const session = await registerAccount(getDb(), input, clientIp(req));
    const res = NextResponse.json(session.account, {status: 201});
    await setSessionCookie(res, session);
    return res;
});
