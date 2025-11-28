
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const positions = await prisma.position.findMany({
      where: { 
        userId: session.user.id,
        status: 'OPEN'
      },
      include: {
        watchlistItem: true,
      },
      orderBy: { entryTime: 'desc' },
    })

    return NextResponse.json(positions)
  } catch (error) {
    console.error('Get positions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
