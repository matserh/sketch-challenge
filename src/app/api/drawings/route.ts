import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all public drawings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const authorId = searchParams.get('authorId')
    const userId = request.cookies.get('userId')?.value

    const where: any = {}
    
    if (authorId) {
      // If authorId is provided, show all drawings by that author (public and private if owner)
      if (userId === authorId) {
        where.authorId = authorId
      } else {
        where.authorId = authorId
        where.isPublic = true
      }
    } else {
      // Default: show only public drawings
      where.isPublic = true
    }

    const drawings = await db.drawing.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true }
        },
        votes: {
          select: { type: true, userId: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate vote counts
    const drawingsWithVotes = drawings.map(drawing => {
      const voteCounts = {
        green: 0,
        blue: 0,
        red: 0,
        x: 0
      }

      drawing.votes.forEach(vote => {
        if (vote.type in voteCounts) {
          voteCounts[vote.type as keyof typeof voteCounts]++
        }
      })

      // Calculate score: green +2, blue +1, red -1, x -2
      const score = (voteCounts.green * 2) + voteCounts.blue - voteCounts.red - (voteCounts.x * 2)

      // Check if current user has voted
      const userVote = userId 
        ? drawing.votes.find(v => v.userId === userId)?.type || null
        : null

      return {
        id: drawing.id,
        title: drawing.title,
        imageData: drawing.imageData,
        isPublic: drawing.isPublic,
        createdAt: drawing.createdAt,
        author: drawing.author,
        votes: voteCounts,
        score,
        userVote
      }
    })

    return NextResponse.json({ drawings: drawingsWithVotes })
  } catch (error) {
    console.error('Get drawings error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des dessins' },
      { status: 500 }
    )
  }
}

// POST - Create a new drawing
export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Vous devez être connecté' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, imageData, isPublic } = body

    if (!title || !imageData) {
      return NextResponse.json(
        { error: 'Titre et image requis' },
        { status: 400 }
      )
    }

    const drawing = await db.drawing.create({
      data: {
        title,
        imageData,
        isPublic: isPublic ?? true,
        authorId: userId
      },
      include: {
        author: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({ drawing })
  } catch (error) {
    console.error('Create drawing error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du dessin' },
      { status: 500 }
    )
  }
}
