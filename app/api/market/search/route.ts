
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const exchange = searchParams.get('exchange') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    if (!query || query.length < 1) {
      return NextResponse.json({ stocks: [] })
    }

    // Build where clause
    const whereClause: any = {
      OR: [
        {
          symbol: {
            contains: query.toUpperCase(),
            mode: 'insensitive'
          }
        },
        {
          companyName: {
            contains: query,
            mode: 'insensitive'
          }
        }
      ],
      hasError: false
    }

    // Add exchange filter if specified
    if (exchange && exchange !== 'all') {
      whereClause.exchange = exchange
    }

    // Search for stocks by symbol or company name
    const stocks = await prisma.stockData.findMany({
      where: whereClause,
      select: {
        symbol: true,
        companyName: true,
        industry: true,
        currentPrice: true,
        previousClose: true,
        marketCap: true,
        peRatio: true,
        volume: true,
        momentum3M: true,
        dataCompleteness: true,
        lastUpdated: true
      },
      orderBy: [
        {
          marketCap: 'desc'
        }
      ],
      take: limit
    })

    // Calculate price change for each stock
    const stocksWithChange = stocks.map((stock: typeof stocks[0]) => {
      const currentPrice = stock.currentPrice ? Number(stock.currentPrice) : null
      const previousClose = stock.previousClose ? Number(stock.previousClose) : null
      
      return {
        ...stock,
        currentPrice,
        previousClose,
        marketCap: stock.marketCap ? Number(stock.marketCap) : null,
        peRatio: stock.peRatio ? Number(stock.peRatio) : null,
        volume: stock.volume ? Number(stock.volume) : null,
        momentum3M: stock.momentum3M ? Number(stock.momentum3M) : null,
        priceChange: currentPrice && previousClose
          ? currentPrice - previousClose
          : null,
        priceChangePercent: currentPrice && previousClose
          ? ((currentPrice - previousClose) / previousClose) * 100
          : null
      }
    })

    return NextResponse.json({ stocks: stocksWithChange })
  } catch (error) {
    console.error('Error searching stocks:', error)
    return NextResponse.json(
      { error: 'Failed to search stocks' },
      { status: 500 }
    )
  }
}
