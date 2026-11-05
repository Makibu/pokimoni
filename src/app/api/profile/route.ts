import {NextResponse} from "next/server";
import {updateProfileSchema} from "@/lib/validation/social";
import {getDb} from "@/server/db/client";
import {parseBody, requireUser, route} from "@/server/http/handler";
import {getProfileChoices, updateProfile} from "@/server/services/profile";

export const GET = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    return NextResponse.json(await getProfileChoices(db, user.id));
});

export const PUT = route(async (req) => {
    const db = getDb();
    const user = await requireUser(db, req);
    await updateProfile(db, user.id, await parseBody(req, updateProfileSchema));
    return NextResponse.json({success: true});
});
