import {NextResponse} from 'next/server'
import {supabaseServer} from '@/lib/supabaseServer'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
    try {
        const {username, email, password} = await req.json()

        if (!username || !email || !password) {
            return NextResponse.json({error: 'Brak wymaganych danych'}, {status: 400})
        }

        // checking if user exists
        const {data: existingUser} = await supabaseServer
            .from('users')
            .select('*')
            .or(`email.eq.${email},username.eq.${username}`)
            .limit(1)

        if (existingUser && existingUser.length > 0) {
            return NextResponse.json({error: 'Użytkownik o podanym emailu lub username już istnieje'}, {status: 400})
        }

        // hashing password
        const hashedPassword = await bcrypt.hash(password, 10)

        // creating user
        const {data: newUser, error: userError} = await supabaseServer
            .from('users')
            .insert([
                {username, email, password: hashedPassword}
            ])
            .select()
            .single()

        if (userError) {
            return NextResponse.json({error: userError.message}, {status: 500})
        }

        const {error: statsError} = await supabaseServer
            .from('user_stats')
            .insert([{uid: newUser.uid}])

        if (statsError) {
            return NextResponse.json({error: statsError.message}, {status: 500})
        }

        return NextResponse.json({
            message: 'Użytkownik utworzony',
            user: {uid: newUser.uid, username: newUser.username, email: newUser.email}
        })
    } catch (err: unknown) {
        let message = 'Nieznany błąd';
        if (err instanceof Error) message = err.message;
        return NextResponse.json({error: message}, {status: 500});
    }
}
