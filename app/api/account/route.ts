
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

    const account = await prisma.tradingAccount.findUnique({
      where: { userId: session.user.id },
    })

    if (!account) {
      return NextResponse.json({ error: 'Trading account not found' }, { status: 404 })
    }

    return NextResponse.json(account)
  } catch (error) {
    console.error('Get account error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.error('[API /account PUT] No session or user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[API /account PUT] User ID:', session.user.id)
    
    const body = await request.json()
    console.log('[API /account PUT] Request body:', JSON.stringify(body, null, 2))
    
    // Whitelist allowed fields to prevent Prisma validation errors
    const updates: any = {}
    
    // Trading account settings
    if (body.alpacaApiKey !== undefined) updates.alpacaApiKey = body.alpacaApiKey
    if (body.alpacaSecretKey !== undefined) updates.alpacaSecretKey = body.alpacaSecretKey
    if (body.isPaperTrading !== undefined) updates.isPaperTrading = body.isPaperTrading
    if (body.startingCapital !== undefined) updates.startingCapital = body.startingCapital
    if (body.currentValue !== undefined) updates.currentValue = body.currentValue
    if (body.totalPnl !== undefined) updates.totalPnl = body.totalPnl
    if (body.maxPositions !== undefined) updates.maxPositions = body.maxPositions
    if (body.trailingStopPct !== undefined) updates.trailingStopPct = body.trailingStopPct
    if (body.timeCutoffHour !== undefined) updates.timeCutoffHour = body.timeCutoffHour
    if (body.timeCutoffMin !== undefined) updates.timeCutoffMin = body.timeCutoffMin
    if (body.automationEnabled !== undefined) updates.automationEnabled = body.automationEnabled
    
    // Notification settings
    if (body.emailNotifications !== undefined) updates.emailNotifications = body.emailNotifications
    if (body.slackNotifications !== undefined) updates.slackNotifications = body.slackNotifications
    if (body.slackChannel !== undefined) updates.slackChannel = body.slackChannel
    if (body.dailySummaryEmail !== undefined) updates.dailySummaryEmail = body.dailySummaryEmail
    
    console.log('[API /account PUT] Updates to apply:', JSON.stringify(updates, null, 2))
    
    const account = await prisma.tradingAccount.update({
      where: { userId: session.user.id },
      data: updates,
    })

    console.log('[API /account PUT] Update successful')
    return NextResponse.json(account)
  } catch (error) {
    console.error('[API /account PUT] Error details:', error)
    if (error instanceof Error) {
      console.error('[API /account PUT] Error message:', error.message)
      console.error('[API /account PUT] Error stack:', error.stack)
    }
    return NextResponse.json({ 
      error: 'Failed to save account settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
