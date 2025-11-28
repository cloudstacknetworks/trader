import dotenv from 'dotenv'
dotenv.config()


/**
 * Delta Stock Data Refresh Script
 * 
 * This script performs an intelligent delta refresh:
 * - Only updates stocks that have likely changed
 * - Much faster than full download (~30-60 minutes)
 * - Runs daily at 2 AM via scheduled task
 * 
 * Usage:
 *   yarn tsx scripts/refresh-stock-data.ts
 */

import { prisma } from '../lib/db'
import { alpacaDataClient } from '../lib/alpaca-data'
import { finnhubClient } from '../lib/finnhub'

interface RefreshStats {
  startTime: Date
  endTime?: Date
  totalChecked: number
  updated: number
  skipped: number
  failed: number
  snapshotsCreated: number
}

const CONFIG = {
  BATCH_SIZE: 100,             // Larger batches for delta refresh
  BATCH_DELAY_MS: 1000,        // 1 second delay between batches
  MAX_AGE_HOURS: 48,           // Prioritize stocks older than 48 hours
  SNAPSHOT_ENABLED: true,      // Create daily snapshots for backtesting
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 3000,
}

const stats: RefreshStats = {
  startTime: new Date(),
  totalChecked: 0,
  updated: 0,
  skipped: 0,
  failed: 0,
  snapshotsCreated: 0,
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Determine if a stock needs updating based on priority
 */
function needsUpdate(lastUpdated: Date): boolean {
  const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60)
  return hoursSinceUpdate >= CONFIG.MAX_AGE_HOURS
}

/**
 * Refresh a single stock
 */
async function refreshStock(symbol: string, retryCount = 0): Promise<boolean> {
  try {
    // Fetch updated data
    const [quote, profile, financials] = await Promise.all([
      finnhubClient.getQuote(symbol),
      finnhubClient.getCompanyProfile(symbol),
      finnhubClient.getCompanyFinancials(symbol),
    ])
    
    if (!quote?.c) {
      stats.skipped++
      return false
    }
    
    const metrics = financials?.metric || {}
    
    // Update only key fields that change frequently
    await prisma.stockData.update({
      where: { symbol },
      data: {
        currentPrice: quote.c || null,
        previousClose: quote.pc || null,
        volume: quote.v ? BigInt(Math.floor(quote.v)) : null,
        marketCap: profile?.marketCapitalization ? profile.marketCapitalization * 1000000 : null,
        lastUpdated: new Date(),
        hasError: false,
        errorMessage: null,
      },
    })
    
    stats.updated++
    return true
    
  } catch (error: any) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      await sleep(CONFIG.RETRY_DELAY_MS)
      return refreshStock(symbol, retryCount + 1)
    }
    
    stats.failed++
    console.error(`  ✗ ${symbol}: ${error.message}`)
    return false
  }
}

/**
 * Create daily snapshot for backtesting
 */
async function createDailySnapshot() {
  if (!CONFIG.SNAPSHOT_ENABLED) return
  
  console.log('\n📸 Creating daily snapshots for backtesting...')
  
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Midnight
  
  // Get all stocks with good data quality
  const stocks = await prisma.stockData.findMany({
    where: {
      hasError: false,
      dataQuality: { gte: 50 },
    },
    select: {
      symbol: true,
      currentPrice: true,
      volume: true,
      marketCap: true,
      peRatio: true,
      psRatio: true,
      pbRatio: true,
      pcfRatio: true,
      roe: true,
      debtToEquity: true,
      currentRatio: true,
      revenueGrowth: true,
      earningsGrowth: true,
      dividendYield: true,
      momentum1M: true,
      momentum3M: true,
      momentum6M: true,
    },
  })
  
  console.log(`  Creating snapshots for ${stocks.length} stocks...`)
  
  // Batch insert snapshots
  const SNAPSHOT_BATCH_SIZE = 500
  for (let i = 0; i < stocks.length; i += SNAPSHOT_BATCH_SIZE) {
    const batch = stocks.slice(i, i + SNAPSHOT_BATCH_SIZE)
    
    await prisma.stockDataSnapshot.createMany({
      data: batch.map(stock => ({
        symbol: stock.symbol,
        snapshotDate: today,
        currentPrice: stock.currentPrice,
        volume: stock.volume,
        marketCap: stock.marketCap,
        peRatio: stock.peRatio,
        psRatio: stock.psRatio,
        pbRatio: stock.pbRatio,
        pcfRatio: stock.pcfRatio,
        roe: stock.roe,
        debtToEquity: stock.debtToEquity,
        currentRatio: stock.currentRatio,
        revenueGrowth: stock.revenueGrowth,
        earningsGrowth: stock.earningsGrowth,
        dividendYield: stock.dividendYield,
        momentum1M: stock.momentum1M,
        momentum3M: stock.momentum3M,
        momentum6M: stock.momentum6M,
      })),
      skipDuplicates: true, // Don't fail if snapshot already exists
    })
    
    stats.snapshotsCreated += batch.length
  }
  
  console.log(`  ✅ Created ${stats.snapshotsCreated} snapshots`)
}

/**
 * Main refresh function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║  Stock Data Refresh - Delta Update                         ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log()
  
  // Create refresh log
  const refreshLog = await prisma.dataRefreshLog.create({
    data: {
      refreshType: 'DELTA_REFRESH',
      status: 'RUNNING',
    },
  })
  
  try {
    // Step 1: Get stocks that need updating
    console.log('🔍 Analyzing which stocks need updates...')
    
    const allStocks = await prisma.stockData.findMany({
      select: {
        symbol: true,
        lastUpdated: true,
        hasError: true,
      },
      orderBy: {
        lastUpdated: 'asc', // Oldest first
      },
    })
    
    const stocksToUpdate = allStocks.filter(s => 
      needsUpdate(s.lastUpdated) || s.hasError
    )
    
    console.log(`  Total stocks in database: ${allStocks.length}`)
    console.log(`  Stocks needing update: ${stocksToUpdate.length}`)
    console.log()
    
    if (stocksToUpdate.length === 0) {
      console.log('✅ All stocks are up to date!')
      
      await prisma.dataRefreshLog.update({
        where: { id: refreshLog.id },
        data: {
          status: 'COMPLETED',
          endTime: new Date(),
        },
      })
      
      return
    }
    
    // Step 2: Update stocks in batches
    console.log(`⚙️  Updating ${stocksToUpdate.length} stocks in batches of ${CONFIG.BATCH_SIZE}`)
    console.log(`   Estimated time: ${Math.round((stocksToUpdate.length / CONFIG.BATCH_SIZE) * (CONFIG.BATCH_DELAY_MS / 1000 / 60))} minutes`)
    console.log()
    
    const totalBatches = Math.ceil(stocksToUpdate.length / CONFIG.BATCH_SIZE)
    
    for (let i = 0; i < stocksToUpdate.length; i += CONFIG.BATCH_SIZE) {
      const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1
      const batch = stocksToUpdate.slice(i, i + CONFIG.BATCH_SIZE)
      
      console.log(`📦 Batch ${batchNumber}/${totalBatches} (${batch.length} stocks)`)
      
      const batchPromises = batch.map(s => refreshStock(s.symbol))
      await Promise.all(batchPromises)
      
      stats.totalChecked += batch.length
      
      const progressPct = Math.round((stats.totalChecked / stocksToUpdate.length) * 100)
      console.log(`   Progress: ${stats.totalChecked}/${stocksToUpdate.length} (${progressPct}%)`)
      console.log(`   Updated: ${stats.updated}, Skipped: ${stats.skipped}, Failed: ${stats.failed}`)
      console.log()
      
      if (i + CONFIG.BATCH_SIZE < stocksToUpdate.length) {
        await sleep(CONFIG.BATCH_DELAY_MS)
      }
    }
    
    // Step 3: Create daily snapshot
    await createDailySnapshot()
    
    // Mark as completed
    stats.endTime = new Date()
    await prisma.dataRefreshLog.update({
      where: { id: refreshLog.id },
      data: {
        status: 'COMPLETED',
        endTime: stats.endTime,
        stocksProcessed: stats.totalChecked,
        stocksUpdated: stats.updated,
        stocksSkipped: stats.skipped,
        stocksFailed: stats.failed,
      },
    })
    
    // Print summary
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║  Refresh Complete!                                         ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log()
    console.log(`⏱️  Duration: ${Math.round((stats.endTime.getTime() - stats.startTime.getTime()) / 1000 / 60)} minutes`)
    console.log(`✅ Updated: ${stats.updated}`)
    console.log(`⊘  Skipped: ${stats.skipped}`)
    console.log(`✗  Failed: ${stats.failed}`)
    console.log(`📸 Snapshots: ${stats.snapshotsCreated}`)
    console.log()
    console.log('🎉 Stock data is now up to date!')
    console.log()
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message)
    
    await prisma.dataRefreshLog.update({
      where: { id: refreshLog.id },
      data: {
        status: 'FAILED',
        endTime: new Date(),
        errorMessage: error.message,
        stocksProcessed: stats.totalChecked,
        stocksUpdated: stats.updated,
        stocksSkipped: stats.skipped,
        stocksFailed: stats.failed,
      },
    })
    
    process.exit(1)
  }
}

// Run the script
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())