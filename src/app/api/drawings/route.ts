import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value

    const where: any = { isPublic: true }

    const drawings = await db.drawing.findMany({
      where,
      include: {
        author: { select: { id: true, name: true } },
        votes: { select: { type: true, userId: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const result = drawings.map(d => {
      const vc = { green: 0, blue: 0, red: 0, x: 0 }
      d.votes.forEach(v => { if (v.type in vc) (vc as any)[v.type]++ })
      const score = (vc.green * 2) + vc.blue - vc.red - (vc.x * 2)
      return {
        id: d.id, title: d.title, imageData: d.imageData, isPublic: d.isPublic,
        createdAt: d.createdAt, author: d.author, votes: vc, score,
        userVote: userId ? d.votes.find(v => v.userId === userId)?.type || null : null
      }
    })

    return NextResponse.json({ drawings: result.sort((a: any, b: any) => b.score - a.score) })
  } catch (error) {
    console.error('Get drawings error:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value
    if (!userId) return NextResponse.json({ error: 'Connectez-vous' }, { status: 401 })

    const { title, imageData, isPublic } = await request.json()
    if (!title || !imageData) return NextResponse.json({ error: 'Titre et image requis' }, { status: 400 })

    const drawing = await db.drawing.create({
      data: { title, imageData, isPublic: isPublic ?? true, authorId: userId },
      include: { author: { select: { id: true, name: true } } }
    })

    return NextResponse.json({ drawing })
  } catch (error) {
    console.error('Create drawing error:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
