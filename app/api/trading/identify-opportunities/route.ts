
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { tradingEngine } from '@/lib/trading-engine'

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const opportunities = await tradingEngine.identifyTradingOpportunities(session.user.id)

    return NextResponse.json({ 
      success: true,
      opportunities 
    })
  } catch (error) {
    console.error('Error identifying opportunities:', error)
    return NextResponse.json(
      { error: 'Failed to identify opportunities' },
      { status: 500 }
    )
  }
}
