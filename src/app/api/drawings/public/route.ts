import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Get public drawings with vote counts, sorted by score
    const drawings = await db.drawing.findMany({
      where: { isPublic: true },
      include: {
        author: {
          select: {
            username: true,
            userId: true
          }
        }
      },
      orderBy: [
        { redCount: 'desc' },
        { blueCount: 'desc' },
        { greenCount: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    })
    
    // Calculate total score for each drawing
    const drawingsWithScore = drawings.map(d => ({
      ...d,
      totalScore: d.redCount * 3 + d.blueCount * 2 + d.greenCount * 1 - d.crossCount * 1
    })).sort((a, b) => b.totalScore - a.totalScore)
    
    return NextResponse.json({
      success: true,
      drawings: drawingsWithScore
    })
  } catch (error) {
    console.error('Get public drawings error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    )
  }
}
