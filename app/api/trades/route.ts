
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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const trades = await prisma.trade.findMany({
      where: { userId: session.user.id },
      include: {
        watchlistItem: true,
      },
      orderBy: { entryTime: 'desc' },
      take: limit,
      skip: offset,
    })

    const totalCount = await prisma.trade.count({
      where: { userId: session.user.id },
    })

    return NextResponse.json({ trades, totalCount })
  } catch (error) {
    console.error('Get trades error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
