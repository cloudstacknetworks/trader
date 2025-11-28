
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

    const body = await request.json().catch(() => ({}))
    const screenId = body.screenId

    const result = await tradingEngine.runOShaughnessyScreening(screenId)

    return NextResponse.json({ 
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('Error running screening:', error)
    return NextResponse.json(
      { 
        error: 'Failed to run screening',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
