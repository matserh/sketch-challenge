import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Simple auth: just a unique email/username, no password
export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()

    if (!email || !name) {
      return NextResponse.json({ error: 'Email et nom requis' }, { status: 400 })
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Check if already taken
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: 'Cet identifiant est déjà pris' }, { status: 409 })
    }

    // Create user (no password)
    const user = await db.user.create({
      data: { email: normalizedEmail, name }
    })

    const response = NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name
    })

    response.cookies.set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365 // 1 year
    })

    return response
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'inscription' }, { status: 500 })
  }
}
