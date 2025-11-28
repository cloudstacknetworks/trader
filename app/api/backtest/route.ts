
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { tradingEngine } from '@/lib/trading-engine'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { screenId, startDate, endDate, initialCapital, maxPositions, trailingStopPct } = body

    // Validate inputs
    if (!screenId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: screenId, startDate, endDate' },
        { status: 400 }
      )
    }

    // Run the backtest
    console.log('Starting backtest with parameters:', body)
    
    const results = await tradingEngine.runBacktest({
      screenId,
      startDate,
      endDate,
      initialCapital: initialCapital || 10000,
      maxPositions: maxPositions || 5,
      trailingStopPct: trailingStopPct || 0.75
    })

    return NextResponse.json(results)

  } catch (error) {
    console.error('Backtest error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run backtest' },
      { status: 500 }
    )
  }
}
