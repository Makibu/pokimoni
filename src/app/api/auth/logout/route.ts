import {NextResponse} from "next/server";
import {clearSessionCookie, route} from "@/server/http/handler";

export const POST = route(async () => {
    const res = NextResponse.json({success: true});
    clearSessionCookie(res);
    return res;
});
