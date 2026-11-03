import {NextResponse} from "next/server";
import {deleteAccountSchema, updateAccountSchema} from "@/lib/validation/account";
import {getDb} from "@/server/db/client";
import {clearSessionCookie, parseBody, requireUser, route, setSessionCookie} from "@/server/http/handler";
import {deleteAccount, updateAccount} from "@/server/services/account";

export const GET = route(async (req) => {
    return NextResponse.json(await requireUser(getDb(), req));
});

export const PATCH = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const input = await parseBody(req, updateAccountSchema);
    const session = await updateAccount(db, user.id, input);
    const res = NextResponse.json(session.account);
    // Re-issued because a password change invalidates tokens of the previous version.
    await setSessionCookie(res, session);
    return res;
});

export const DELETE = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const {password} = await parseBody(req, deleteAccountSchema);
    await deleteAccount(db, user.id, password);
    const res = NextResponse.json({success: true});
    clearSessionCookie(res);
    return res;
});
