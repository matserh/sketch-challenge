import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Login: just check if email exists, no password
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const user = await db.user.findUnique({ where: { email: normalizedEmail } })

    if (!user) {
      return NextResponse.json({ error: 'Identifiant non trouvé' }, { status: 404 })
    }

    const response = NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name
    })

    response.cookies.set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
