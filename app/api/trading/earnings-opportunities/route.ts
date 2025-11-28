
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

    const body = await request.json()
    const { screenId } = body

    if (!screenId) {
      return NextResponse.json({ error: 'screenId is required' }, { status: 400 })
    }

    console.log(`🎯 Identifying earnings opportunities for screen ${screenId}`)
    const opportunities = await tradingEngine.identifyEarningsOpportunities(
      screenId,
      session.user.id
    )

    console.log(`✅ Found ${opportunities.length} earnings opportunities`)

    return NextResponse.json({ 
      success: true,
      opportunities,
      count: opportunities.length
    })
  } catch (error: any) {
    console.error('❌ Error identifying earnings opportunities:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to identify earnings opportunities' },
      { status: 500 }
    )
  }
}
