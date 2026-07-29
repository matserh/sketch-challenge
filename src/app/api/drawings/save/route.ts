import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, title, imageData, isPublic } = body
    
    if (!userId || !title || !imageData) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      )
    }
    
    // Find user by internal id
    const user = await db.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }
    
    const drawing = await db.drawing.create({
      data: {
        title,
        imageData,
        isPublic: isPublic || false,
        authorId: user.id
      }
    })
    
    return NextResponse.json({
      success: true,
      drawing: {
        id: drawing.id,
        title: drawing.title,
        isPublic: drawing.isPublic
      }
    })
  } catch (error) {
    console.error('Save drawing error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { drawingId, isPublic, userId } = await request.json()
    
    if (!drawingId || !userId) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      )
    }
    
    // Verify ownership
    const drawing = await db.drawing.findUnique({
      where: { id: drawingId },
      include: { author: true }
    })
    
    if (!drawing) {
      return NextResponse.json(
        { error: 'Dessin non trouvé' },
        { status: 404 }
      )
    }
    
    if (drawing.authorId !== userId) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }
    
    const updated = await db.drawing.update({
      where: { id: drawingId },
      data: { isPublic }
    })
    
    return NextResponse.json({
      success: true,
      drawing: {
        id: updated.id,
        isPublic: updated.isPublic
      }
    })
  } catch (error) {
    console.error('Update drawing error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    )
  }
}
