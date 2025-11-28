
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET: Get data refresh status and logs
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get latest refresh logs
    const logs = await prisma.dataRefreshLog.findMany({
      orderBy: { startTime: 'desc' },
      take: 10,
    })

    // Check if there's a running refresh
    const runningRefresh = logs.find((log: (typeof logs)[0]) => log.status === 'RUNNING')

    // Get stock data statistics - count all and those with complete data
    const totalStocksCount = await prisma.stockData.count()
    const stocksWithDataCount = await prisma.stockData.count({
      where: { hasError: false }
    })

    const stats = await prisma.stockData.aggregate({
      _avg: {
        dataQuality: true,
      },
    })

    // Get oldest and newest update times
    const oldest = await prisma.stockData.findFirst({
      where: { hasError: false },
      orderBy: { lastUpdated: 'asc' },
      select: { lastUpdated: true },
    })

    const newest = await prisma.stockData.findFirst({
      where: { hasError: false },
      orderBy: { lastUpdated: 'desc' },
      select: { lastUpdated: true },
    })

    // Calculate stocks needing update (older than 48 hours)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const needingUpdate = await prisma.stockData.count({
      where: {
        OR: [
          { lastUpdated: { lt: twoDaysAgo } },
          { hasError: true },
        ],
      },
    })

    // Alpaca universe size (12,260 tradeable US stocks)
    const ALPACA_UNIVERSE_SIZE = 12260
    
    // Build status object
    const status = {
      isRefreshing: !!runningRefresh,
      refreshType: runningRefresh?.refreshType || null,
      totalStocks: totalStocksCount,
      stocksWithData: stocksWithDataCount,
      averageDataQuality: stats._avg.dataQuality || 0,
      oldestUpdate: oldest?.lastUpdated?.toISOString() || null,
      newestUpdate: newest?.lastUpdated?.toISOString() || null,
      stocksNeedingUpdate: needingUpdate,
      expectedUniverseSize: ALPACA_UNIVERSE_SIZE, // Alpaca tradeable universe
      currentProgress: runningRefresh ? {
        stocksProcessed: totalStocksCount, // Use actual DB count as best proxy
        successCount: stocksWithDataCount,
        failedCount: runningRefresh.stocksFailed || 0,
        totalStocks: totalStocksCount,
        isInitialLoad: runningRefresh.refreshType === 'INITIAL_LOAD'
      } : undefined
    }

    return NextResponse.json({
      status,
      logs,
    })
  } catch (error: any) {
    console.error('Error fetching data refresh status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch data refresh status' },
      { status: 500 }
    )
  }
}

// POST: Trigger manual data refresh
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type = 'DELTA_REFRESH' } = body

    // Check if a refresh is already running
    const runningRefresh = await prisma.dataRefreshLog.findFirst({
      where: { status: 'RUNNING' },
    })

    if (runningRefresh) {
      return NextResponse.json(
        { error: 'A refresh is already in progress' },
        { status: 409 }
      )
    }

    // Create a new refresh log
    const refreshLog = await prisma.dataRefreshLog.create({
      data: {
        refreshType: type,
        status: 'RUNNING',
      },
    })

    // Trigger the refresh script asynchronously
    // Note: In production, this would be handled by a job queue
    const { spawn } = require('child_process')
    const scriptName = type === 'INITIAL_LOAD' ? 'download-stock-data' : 'refresh-stock-data'
    
    const child = spawn('yarn', ['tsx', `scripts/${scriptName}.ts`], {
      detached: true,
      stdio: 'ignore',
      cwd: process.cwd(),
    })
    
    child.unref() // Allow the parent process to exit independently

    return NextResponse.json({
      message: 'Data refresh started',
      refreshLogId: refreshLog.id,
      type,
    })
  } catch (error: any) {
    console.error('Error starting data refresh:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start data refresh' },
      { status: 500 }
    )
  }
}
