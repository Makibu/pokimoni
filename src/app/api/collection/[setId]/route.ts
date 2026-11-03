import {NextResponse} from "next/server";
import {getDb} from "@/server/db/client";
import {requireUser, route} from "@/server/http/handler";
import {getSetCollection} from "@/server/services/collection";

export const GET = route<{params: Promise<{setId: string}>}>(async (req, {params}) => {
    const db = getDb();
    const user = await requireUser(db, req);
    const {setId} = await params;
    return NextResponse.json(await getSetCollection(db, user.id, setId));
});
