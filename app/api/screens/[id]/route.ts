
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Update screen
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const screenId = params.id
    const updates = await request.json()

    const screen = await prisma.screen.update({
      where: { id: screenId },
      data: updates
    })

    return NextResponse.json(screen)
  } catch (error: any) {
    console.error('Error updating screen:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update screen' },
      { status: 500 }
    )
  }
}

// Delete screen
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const screenId = params.id

    // Check if screen has watchlist items
    const watchlistCount = await prisma.watchlistItem.count({
      where: { screenId }
    })

    if (watchlistCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete screen with existing watchlist items. Remove them first.' },
        { status: 400 }
      )
    }

    await prisma.screen.delete({
      where: { id: screenId }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting screen:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete screen' },
      { status: 500 }
    )
  }
}
