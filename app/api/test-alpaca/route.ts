
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createAlpacaClient } from '@/lib/alpaca'

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { apiKey, secretKey, isPaperTrading } = await request.json()

    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { error: 'API key and secret key are required' },
        { status: 400 }
      )
    }

    const alpacaClient = createAlpacaClient({
      apiKey,
      secretKey,
      isPaperTrading: isPaperTrading !== false,
    })

    // Test connection by fetching account info
    const accountInfo = await alpacaClient.getAccount()
    
    return NextResponse.json({
      success: true,
      accountInfo: {
        accountNumber: accountInfo.account_number,
        status: accountInfo.status,
        tradingBlocked: accountInfo.trading_blocked,
        equity: accountInfo.equity,
        buyingPower: accountInfo.buying_power,
      },
    })
  } catch (error) {
    console.error('Alpaca connection test error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to Alpaca API' },
      { status: 500 }
    )
  }
}
