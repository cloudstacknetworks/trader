
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { tradingEngine } from '@/lib/trading-engine'

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const positionId = params.id

    await tradingEngine.sellPosition(positionId, 'MANUAL')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error closing position:', error)
    return NextResponse.json(
      { error: 'Failed to close position' },
      { status: 500 }
    )
  }
}
