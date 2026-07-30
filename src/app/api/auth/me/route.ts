import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value
    if (!userId) return NextResponse.json({ user: null })

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true }
    })

    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ user: null })
  }
}