import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value
    if (!userId) return NextResponse.json({ error: 'Connectez-vous' }, { status: 401 })

    const { drawingId, type } = await request.json()
    if (!drawingId || !type) return NextResponse.json({ error: 'Requis' }, { status: 400 })

    const validTypes = ['green', 'blue', 'red', 'x']
    if (!validTypes.includes(type)) return NextResponse.json({ error: 'Type invalide' }, { status: 400 })

    const drawing = await db.drawing.findUnique({ where: { id: drawingId } })
    if (!drawing) return NextResponse.json({ error: 'Dessin non trouvé' }, { status: 404 })

    const existing = await db.vote.findUnique({
      where: { drawingId_userId: { drawingId, userId } }
    })

    if (existing) {
      await db.vote.update({ where: { id: existing.id }, data: { type } })
    } else {
      await db.vote.create({ data: { type, drawingId, userId } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
