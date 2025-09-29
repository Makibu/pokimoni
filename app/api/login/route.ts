import {NextResponse} from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {supabaseServer} from "@/lib/supabaseServer";

const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(req: Request) {
    try {
        const {email, password} = await req.json()

        const {data: users, error} = await supabaseServer
            .from('users')
            .select('*')
            .eq('email', email)
            .limit(1)

        if (error || !users || users.length === 0) {
            return NextResponse.json({error: 'Nieprawidłowy email lub hasło'}, {status: 401})
        }

        const user = users[0]

        // checking bcyrpted password from DB
        const valid = await bcrypt.compare(password, user.password)
        if (!valid) {
            return NextResponse.json({error: 'Nieprawidłowy email lub hasło'}, {status: 401})
        }

        // generating JWT
        const token = jwt.sign({uid: user.uid, email: user.email}, JWT_SECRET, {expiresIn: '30d'})

        return NextResponse.json({token, user: {uid: user.uid, email: user.email, username: user.username}})

    } catch (err: any) {
        return NextResponse.json({error: err.message}, {status: 500})
    }
}
