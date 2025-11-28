
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { finnhubClient } from '@/lib/finnhub'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const symbol = params.symbol.toUpperCase()

    // Get stock data from local database
    const stockData = await prisma.stockData.findUnique({
      where: { symbol }
    })

    if (!stockData) {
      return NextResponse.json(
        { error: 'Stock not found' },
        { status: 404 }
      )
    }

    // Get real-time quote from Finnhub (non-blocking, use cached if fails)
    let quote = null
    try {
      quote = await finnhubClient.getQuote(symbol)
    } catch (error) {
      console.error(`Failed to fetch real-time quote for ${symbol}:`, error)
      // Use cached price data
      quote = {
        c: stockData.currentPrice,
        pc: stockData.previousClose,
        o: null,
        h: null,
        l: null
      }
    }

    // Check if stock is in any watchlist
    const watchlistItem = await prisma.watchlistItem.findFirst({
      where: {
        ticker: symbol
      }
    })

    // Get stock news (non-blocking, non-critical)
    let news = []
    try {
      news = await finnhubClient.getCompanyNews(
        symbol,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      ) || []
    } catch (error) {
      // Silently handle news fetch errors - news is optional
      news = []
    }

    // Convert BigInt values to strings for JSON serialization
    const serializedStockData = stockData ? JSON.parse(
      JSON.stringify(stockData, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    ) : null
    
    const response = {
      ...serializedStockData,
      realTimeQuote: quote,
      isInWatchlist: !!watchlistItem,
      news: news.slice(0, 10)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching stock details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock details' },
      { status: 500 }
    )
  }
}
