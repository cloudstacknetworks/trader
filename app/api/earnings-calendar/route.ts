
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET: Fetch earnings calendar for a date range
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from') // YYYY-MM-DD
    const to = searchParams.get('to') // YYYY-MM-DD
    const symbol = searchParams.get('symbol')
    const earningsToday = searchParams.get('earningsToday') === 'true'

    const where: any = {}

    if (symbol) {
      where.symbol = symbol
    }

    if (earningsToday) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      where.earningsDate = {
        gte: today,
        lt: tomorrow
      }
    } else if (from && to) {
      where.earningsDate = {
        gte: new Date(from),
        lte: new Date(to)
      }
    }

    const earnings = await prisma.earningsCalendar.findMany({
      where,
      orderBy: { earningsDate: 'asc' },
      take: 1000
    })

    return NextResponse.json({ earnings })
  } catch (error: any) {
    console.error('Error fetching earnings calendar:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch earnings calendar' },
      { status: 500 }
    )
  }
}

// POST: Update earnings results (actual EPS reported)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, actualEPS } = body

    if (!id || actualEPS === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: id and actualEPS' },
        { status: 400 }
      )
    }

    // Fetch the earnings record
    const earning = await prisma.earningsCalendar.findUnique({
      where: { id }
    })

    if (!earning) {
      return NextResponse.json(
        { error: 'Earnings record not found' },
        { status: 404 }
      )
    }

    // Calculate beat and surprise
    const beat = earning.estimatedEPS ? actualEPS > earning.estimatedEPS : null
    const surprise = earning.estimatedEPS 
      ? ((actualEPS - earning.estimatedEPS) / Math.abs(earning.estimatedEPS)) * 100
      : null

    // Update the record
    const updated = await prisma.earningsCalendar.update({
      where: { id },
      data: {
        actualEPS,
        beat,
        surprise
      }
    })

    return NextResponse.json({ earning: updated })
  } catch (error: any) {
    console.error('Error updating earnings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update earnings' },
      { status: 500 }
    )
  }
}
