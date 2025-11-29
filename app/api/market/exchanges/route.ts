
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get distinct exchanges from the stock data
    const exchanges = await prisma.stockData.findMany({
      where: {
        hasError: false,
        exchange: {
          not: null
        }
      },
      select: {
        exchange: true
      },
      distinct: ['exchange'],
      orderBy: {
        exchange: 'asc'
      }
    })

    // Extract unique exchange names and filter out nulls
    const exchangeList = exchanges
      .map((e: { exchange: string | null }) => e.exchange)
      .filter((e: string | null): e is string => e !== null)

    return NextResponse.json({ exchanges: exchangeList })
  } catch (error) {
    console.error('Error fetching exchanges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exchanges' },
      { status: 500 }
    )
  }
}
