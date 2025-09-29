import {NextResponse} from 'next/server';
import {supabaseServer} from '@/lib/supabaseServer';
import bcrypt from 'bcryptjs';

export async function PATCH(req: Request) {
    const {searchParams} = new URL(req.url);
    const uid = searchParams.get('uid');

    if (!uid) {
        return NextResponse.json({error: "Brak uid w zapytaniu"}, {status: 400});
    }

    const {username, email, password} = await req.json();

    const updates: Record<string, any> = {};
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (password) updates.password = await bcrypt.hash(password, 10);

    const {data, error} = await supabaseServer
        .from('users')
        .update(updates)
        .eq('uid', uid)
        .select()
        .single();

    if (error) return NextResponse.json({error: error.message}, {status: 500});

    return NextResponse.json({uid: data.uid, email: data.email, username: data.username});
}

export async function DELETE(req: Request) {
    try {
        const {searchParams} = new URL(req.url);
        const uid = searchParams.get('uid');

        if (!uid) {
            return NextResponse.json({error: "Brak uid w zapytaniu"}, {status: 400});
        }

        const {error} = await supabaseServer
            .from("users")
            .delete()
            .eq("uid", uid);

        if (error) return NextResponse.json({error: error.message}, {status: 500});

        return NextResponse.json({message: "Konto usunięte"});
    } catch (err: any) {
        return NextResponse.json({error: err.message}, {status: 500});
    }
}
