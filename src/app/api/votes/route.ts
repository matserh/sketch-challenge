import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Vote for a drawing
export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour voter' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { drawingId, type } = body

    if (!drawingId || !type) {
      return NextResponse.json(
        { error: 'ID du dessin et type de vote requis' },
        { status: 400 }
      )
    }

    // Validate vote type
    const validTypes = ['green', 'blue', 'red', 'x']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Type de vote invalide' },
        { status: 400 }
      )
    }

    // Check if drawing exists
    const drawing = await db.drawing.findUnique({
      where: { id: drawingId }
    })

    if (!drawing) {
      return NextResponse.json(
        { error: 'Dessin non trouvé' },
        { status: 404 }
      )
    }

    // Check if user already voted
    const existingVote = await db.vote.findUnique({
      where: {
        drawingId_userId: {
          drawingId,
          userId
        }
      }
    })

    let vote
    if (existingVote) {
      // Update existing vote
      vote = await db.vote.update({
        where: { id: existingVote.id },
        data: { type }
      })
    } else {
      // Create new vote
      vote = await db.vote.create({
        data: {
          type,
          drawingId,
          userId
        }
      })
    }

    return NextResponse.json({ vote })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du vote' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a vote
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Vous devez être connecté' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const drawingId = searchParams.get('drawingId')

    if (!drawingId) {
      return NextResponse.json(
        { error: 'ID du dessin requis' },
        { status: 400 }
      )
    }

    await db.vote.delete({
      where: {
        drawingId_userId: {
          drawingId,
          userId
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete vote error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du vote' },
      { status: 500 }
    )
  }
}
