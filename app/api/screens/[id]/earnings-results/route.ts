import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: screenId } = await params
    
    // Get the screen with its watchlist items
    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
      include: {
        watchlistItems: {
          select: {
            ticker: true
          }
        }
      }
    })

    if (!screen) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
    }

    // Get the date range from query params (default to today)
    const url = new URL(request.url)
    const fromDate = url.searchParams.get('from') || new Date().toISOString().split('T')[0]
    const toDate = url.searchParams.get('to') || new Date().toISOString().split('T')[0]

    // Get all tickers from the screen
    const tickers = screen.watchlistItems.map(w => w.ticker)

    if (tickers.length === 0) {
      return NextResponse.json({
        screen: {
          id: screen.id,
          name: screen.name,
          screenType: screen.screenType,
          minEarningsSurprise: Number(screen.minEarningsSurprise || 5),
          allocatedCapital: screen.allocatedCapital
        },
        earningsResults: [],
        trades: [],
        summary: {
          totalMonitoredStocks: 0,
          scheduledEarnings: 0,
          reportedEarnings: 0,
          beats: 0,
          qualifiedBeats: 0,
          misses: 0,
          pending: 0
        }
      })
    }

    // Fetch earnings for these tickers in the date range
    const earnings = await prisma.earningsCalendar.findMany({
      where: {
        symbol: { in: tickers },
        earningsDate: {
          gte: new Date(fromDate),
          lte: new Date(toDate + 'T23:59:59.999Z')
        }
      },
      orderBy: [
        { earningsDate: 'asc' },
        { symbol: 'asc' }
      ]
    })

    // Calculate summary statistics
    const reported = earnings.filter(e => e.actualEPS !== null)
    const beats = earnings.filter(e => e.beat === true)
    const beatThreshold = Number(screen.minEarningsSurprise || 5)
    const qualifiedBeats = earnings.filter(e => 
      e.surprise !== null && e.surprise >= beatThreshold
    )
    const misses = earnings.filter(e => e.beat === false)
    const pending = earnings.filter(e => e.actualEPS === null)

    // Check for executed trades
    const trades = await prisma.trade.findMany({
      where: {
        watchlistItem: {
          screenId: screen.id
        },
        entryTime: {
          gte: new Date(fromDate),
          lte: new Date(toDate + 'T23:59:59.999Z')
        }
      },
      include: {
        watchlistItem: {
          select: { ticker: true }
        }
      },
      orderBy: {
        entryTime: 'desc'
      }
    })

    return NextResponse.json({
      screen: {
        id: screen.id,
        name: screen.name,
        screenType: screen.screenType,
        minEarningsSurprise: Number(screen.minEarningsSurprise || 5),
        allocatedCapital: screen.allocatedCapital
      },
      earningsResults: earnings.map(e => ({
        symbol: e.symbol,
        earningsDate: e.earningsDate.toISOString(),
        estimatedEPS: e.estimatedEPS,
        actualEPS: e.actualEPS,
        beat: e.beat,
        surprise: e.surprise,
        qualifiedBeat: e.surprise !== null && e.surprise >= beatThreshold
      })),
      trades: trades.filter(t => t.watchlistItem !== null).map(t => {
        const entryPrice = Number(t.entryPrice);
        const exitPrice = t.exitPrice ? Number(t.exitPrice) : null;
        const pnlPercent = exitPrice ? ((exitPrice - entryPrice) / entryPrice) * 100 : null;
        
        return {
          id: t.id,
          symbol: t.watchlistItem!.ticker,
          side: 'BUY',
          quantity: t.quantity,
          entryPrice: entryPrice,
          entryTime: t.entryTime.toISOString(),
          exitPrice: exitPrice,
          exitTime: t.exitTime ? t.exitTime.toISOString() : null,
          pnl: pnlPercent
        };
      }),
      summary: {
        totalMonitoredStocks: tickers.length,
        scheduledEarnings: earnings.length,
        reportedEarnings: reported.length,
        beats: beats.length,
        qualifiedBeats: qualifiedBeats.length,
        misses: misses.length,
        pending: pending.length
      }
    })
  } catch (error) {
    console.error('Get earnings results error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
