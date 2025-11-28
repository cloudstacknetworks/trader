
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const screenId = searchParams.get('screenId')

    const whereClause = screenId ? { screenId } : {}

    const watchlist = await prisma.watchlistItem.findMany({
      where: whereClause,
      include: {
        screen: true,
      },
      orderBy: [
        { score: 'desc' },
        { dateAdded: 'desc' }
      ],
    })

    return NextResponse.json(watchlist)
  } catch (error) {
    console.error('Get watchlist error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
