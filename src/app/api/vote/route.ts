import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { userId, drawingId, voteType } = await request.json()
    
    if (!userId || !drawingId || !voteType) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      )
    }
    
    const validTypes = ['green', 'blue', 'red', 'cross']
    if (!validTypes.includes(voteType)) {
      return NextResponse.json(
        { error: 'Type de vote invalide' },
        { status: 400 }
      )
    }
    
    // Check if user already voted
    const existingVote = await db.vote.findUnique({
      where: {
        userId_drawingId: { userId, drawingId }
      }
    })
    
    if (existingVote) {
      // Update existing vote
      const oldType = existingVote.voteType
      
      // Decrement old count
      await db.drawing.update({
        where: { id: drawingId },
        data: { [`${oldType}Count`]: { decrement: 1 } }
      })
      
      // Update vote and increment new count
      await db.vote.update({
        where: { id: existingVote.id },
        data: { voteType }
      })
      
      await db.drawing.update({
        where: { id: drawingId },
        data: { [`${voteType}Count`]: { increment: 1 } }
      })
      
      return NextResponse.json({ success: true, updated: true })
    }
    
    // Create new vote
    await db.vote.create({
      data: {
        userId,
        drawingId,
        voteType
      }
    })
    
    // Increment vote count
    await db.drawing.update({
      where: { id: drawingId },
      data: { [`${voteType}Count`]: { increment: 1 } }
    })
    
    return NextResponse.json({ success: true, created: true })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du vote' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const drawingId = searchParams.get('drawingId')
    
    if (!userId || !drawingId) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      )
    }
    
    const vote = await db.vote.findUnique({
      where: {
        userId_drawingId: { userId, drawingId }
      }
    })
    
    return NextResponse.json({
      success: true,
      vote: vote ? vote.voteType : null
    })
  } catch (error) {
    console.error('Get vote error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du vote' },
      { status: 500 }
    )
  }
}
