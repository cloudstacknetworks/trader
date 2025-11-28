import dotenv from 'dotenv'
dotenv.config()


/**
 * Initial Stock Data Download Script
 * 
 * This script downloads all US stock data from Finnhub and stores it locally.
 * Runtime: ~2-4 hours for 8,000+ stocks
 * 
 * Usage:
 *   yarn tsx scripts/download-stock-data.ts
 */

import { prisma } from '../lib/db'
import { finnhubClient } from '../lib/finnhub'

interface DownloadStats {
  startTime: Date
  endTime?: Date
  totalStocks: number
  processed: number
  successful: number
  skipped: number
  failed: number
  currentSymbol?: string
  errors: Array<{ symbol: string; error: string }>
}

const CONFIG = {
  BATCH_SIZE: 15,              // Process 15 stocks at a time (60 calls per batch for 60/min limit)
  BATCH_DELAY_MS: 60000,       // 60 second delay between batches (respect Finnhub 60 calls/min)
  MAX_RETRIES: 3,              // Retry failed requests up to 3 times
  RETRY_DELAY_MS: 10000,       // Wait 10 seconds before retrying
  LOG_INTERVAL: 100,           // Log progress every 100 stocks
}

const stats: DownloadStats = {
  startTime: new Date(),
  totalStocks: 0,
  processed: 0,
  successful: 0,
  skipped: 0,
  failed: 0,
  errors: [],
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate data quality score (0-100) based on how complete the data is
 */
function calculateDataQuality(data: any): number {
  const fields = [
    'currentPrice', 'volume', 'marketCap',
    'peRatio', 'psRatio', 'pbRatio',
    'roe', 'debtToEquity', 'currentRatio',
    'revenueGrowth', 'earningsGrowth',
    'dividendYield', 'sector', 'industry'
  ]
  
  const presentFields = fields.filter(field => {
    const value = data[field]
    return value !== null && value !== undefined && value !== 0
  })
  
  return Math.round((presentFields.length / fields.length) * 100)
}

/**
 * Calculate momentum from historical price data
 */
async function calculateMomentum(symbol: string): Promise<{
  momentum1M?: number
  momentum3M?: number
  momentum6M?: number
  momentum12M?: number
}> {
  try {
    const today = new Date()
    const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)
    
    // Get historical candles from Finnhub
    const candles = await finnhubClient.getHistoricalPrices(
      symbol,
      'D', // Daily resolution
      Math.floor(oneYearAgo.getTime() / 1000),
      Math.floor(today.getTime() / 1000)
    )
    
    if (!candles?.c || candles.c.length < 30) return {}
    
    const prices = candles.c
    const latestPrice = prices[prices.length - 1]
    
    // Calculate percentage returns
    const calc = (daysAgo: number) => {
      if (prices.length < daysAgo) return undefined
      const oldPrice = prices[prices.length - daysAgo]
      return ((latestPrice - oldPrice) / oldPrice) * 100
    }
    
    return {
      momentum1M: calc(21),   // ~21 trading days = 1 month
      momentum3M: calc(63),   // ~63 trading days = 3 months
      momentum6M: calc(126),  // ~126 trading days = 6 months
      momentum12M: calc(252), // ~252 trading days = 1 year
    }
  } catch (error) {
    return {}
  }
}

/**
 * Determine data completeness level based on available fields
 */
function determineDataCompleteness(data: any): string {
  const hasFullFundamentals = !!(
    data.peRatio && data.psRatio && data.roe && data.debtToEquity &&
    data.revenueGrowth && data.currentRatio && data.marketCap
  )
  
  const hasPartialData = !!(
    data.currentPrice && data.marketCap &&
    (data.volume || data.peRatio || data.sector)
  )
  
  const hasBasicData = !!(data.currentPrice && data.companyName)
  
  if (hasFullFundamentals) return 'FULL'
  if (hasPartialData) return 'PARTIAL'
  if (hasBasicData) return 'BASIC'
  return 'MINIMAL'
}

/**
 * Download data for a single stock
 */
async function downloadStockData(symbol: string, retryCount = 0): Promise<boolean> {
  try {
    stats.currentSymbol = symbol
    
    // Fetch all data in parallel for speed
    const [quote, profile, financials, momentum] = await Promise.all([
      finnhubClient.getQuote(symbol).catch(() => null),
      finnhubClient.getCompanyProfile(symbol).catch(() => null),
      finnhubClient.getCompanyFinancials(symbol).catch(() => null),
      calculateMomentum(symbol).catch(() => ({})),
    ])
    
    // Only skip if we have ZERO useful data (no price and no profile)
    if (!quote?.c && !profile?.name) {
      console.log(`  ⊘ ${symbol}: No usable data at all, skipping`)
      stats.skipped++
      return false
    }
    
    const metrics = financials?.metric || {}
    const momentumData: {momentum1M?: number, momentum3M?: number, momentum6M?: number, momentum12M?: number} = momentum || {}
    
    // Prepare stock data
    const stockData = {
      symbol,
      
      // Company Info
      companyName: profile.name || null,
      sector: profile.finnhubIndustry || null,
      industry: profile.finnhubIndustry || null,
      country: profile.country || null,
      exchange: profile.exchange || null,
      
      // Price & Volume
      currentPrice: quote.c || null,
      previousClose: quote.pc || null,
      volume: quote.v ? BigInt(Math.floor(quote.v)) : null,
      avgVolume: null, // Can be calculated later
      marketCap: profile.marketCapitalization ? profile.marketCapitalization * 1000000 : null,
      
      // Valuation Metrics
      peRatio: metrics.peBasicExclExtraTTM || metrics.peNormalizedAnnual || null,
      psRatio: metrics.psTTM || metrics.psAnnual || null,
      pbRatio: metrics.pbAnnual || null,
      pcfRatio: metrics.pcfShareTTM || null,
      evToEbitda: metrics.evToEbitdaTTM || null,
      
      // Financial Health
      roe: metrics.roeTTM || metrics.roeRfy || null,
      roa: metrics.roaTTM || metrics.roaRfy || null,
      debtToEquity: metrics.totalDebt2Equity || null,
      currentRatio: metrics.currentRatioAnnual || null,
      quickRatio: metrics.quickRatioAnnual || null,
      
      // Profitability
      grossMargin: metrics.grossMarginTTM || null,
      operatingMargin: metrics.operatingMarginTTM || null,
      netMargin: metrics.netMarginTTM || null,
      
      // Growth Metrics
      revenueGrowth: metrics.revenueGrowthTTMYoy || null,
      earningsGrowth: metrics.epsGrowthTTMYoy || null,
      revenueGrowth3Y: metrics.revenueGrowth3Y || null,
      earningsGrowth3Y: metrics.epsGrowth3Y || null,
      
      // Income Metrics
      dividendYield: metrics.dividendYieldIndicatedAnnual || null,
      payoutRatio: metrics.payoutRatioTTM || null,
      
      // Momentum Metrics
      momentum1M: momentumData.momentum1M || null,
      momentum3M: momentumData.momentum3M || null,
      momentum6M: momentumData.momentum6M || null,
      momentum12M: momentumData.momentum12M || null,
      
      // Technical Indicators
      beta: metrics.beta || null,
      fiftyDayMA: metrics['52WeekHigh'] ? quote.c / metrics['52WeekHigh'] : null,
      twoHundredDayMA: metrics['52WeekLow'] ? quote.c / metrics['52WeekLow'] : null,
      
      // Additional Metrics
      sharesOutstanding: metrics.marketCapitalization && quote.c 
        ? BigInt(Math.floor((metrics.marketCapitalization * 1000000) / quote.c))
        : null,
      floatShares: null,
      insiderOwnership: null,
      institutionalOwnership: null,
      
      // Data Quality
      lastUpdated: new Date(),
      dataQuality: 0, // Will be calculated
      dataCompleteness: 'MINIMAL' as any, // Will be calculated
      hasError: false,
      errorMessage: null,
    }
    
    // Calculate data quality and completeness
    stockData.dataQuality = calculateDataQuality(stockData)
    stockData.dataCompleteness = determineDataCompleteness(stockData) as any
    
    // Upsert into database
    await prisma.stockData.upsert({
      where: { symbol },
      update: stockData,
      create: stockData,
    })
    
    // Log with completeness indicator
    const icons = {
      FULL: '✓',
      PARTIAL: '◐',
      BASIC: '◯',
      MINIMAL: '·'
    }
    const icon = icons[stockData.dataCompleteness as keyof typeof icons] || '·'
    console.log(`  ${icon} ${symbol}: ${stockData.dataCompleteness} data (quality: ${stockData.dataQuality})`)
    
    stats.successful++
    return true
    
  } catch (error: any) {
    // Handle rate limiting
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      if (retryCount < CONFIG.MAX_RETRIES) {
        console.log(`  ⟳ ${symbol}: Rate limited, waiting ${CONFIG.RETRY_DELAY_MS}ms...`)
        await sleep(CONFIG.RETRY_DELAY_MS)
        return downloadStockData(symbol, retryCount + 1)
      }
    }
    
    // Log error
    const errorMsg = error.message || String(error)
    console.error(`  ✗ ${symbol}: ${errorMsg}`)
    stats.errors.push({ symbol, error: errorMsg })
    stats.failed++
    
    // Store error in database
    try {
      await prisma.stockData.upsert({
        where: { symbol },
        update: {
          hasError: true,
          errorMessage: errorMsg,
          lastUpdated: new Date(),
        },
        create: {
          symbol,
          hasError: true,
          errorMessage: errorMsg,
          lastUpdated: new Date(),
        },
      })
    } catch (dbError) {
      console.error(`  ✗ ${symbol}: Failed to record error in DB`)
    }
    
    return false
  }
}

/**
 * Main download function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║  Stock Data Download - Initial Load                        ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log()
  
  // Create refresh log
  const refreshLog = await prisma.dataRefreshLog.create({
    data: {
      refreshType: 'INITIAL_LOAD',
      status: 'RUNNING',
    },
  })
  
  try {
    // Step 1: Fetch all US stock symbols
    console.log('📥 Fetching stock universe from Finnhub...')
    let allSymbols = await finnhubClient.getStockSymbols('US')
    console.log(`   Found ${allSymbols.length} symbols`)
    
    // Step 2: Filter to clean common stocks
    console.log('🔍 Filtering to common stocks...')
    allSymbols = allSymbols.filter((s: any) => 
      s.type === 'Common Stock' && 
      !s.symbol.includes('.') &&
      !s.symbol.includes('-') &&
      s.symbol.length >= 1 &&
      s.symbol.length <= 5 &&
      /^[A-Z]+$/.test(s.symbol)
    )
    console.log(`   Filtered to ${allSymbols.length} common stocks`)
    
    stats.totalStocks = allSymbols.length
    const symbols = allSymbols.map((s: any) => s.symbol)
    
    // Step 3: Process in batches
    console.log()
    console.log(`⚙️  Processing ${symbols.length} stocks in batches of ${CONFIG.BATCH_SIZE}`)
    console.log(`   Estimated time: ${Math.round((symbols.length / CONFIG.BATCH_SIZE) * (CONFIG.BATCH_DELAY_MS / 1000 / 60))} minutes`)
    console.log()
    
    const totalBatches = Math.ceil(symbols.length / CONFIG.BATCH_SIZE)
    
    for (let i = 0; i < symbols.length; i += CONFIG.BATCH_SIZE) {
      const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1
      const batch = symbols.slice(i, i + CONFIG.BATCH_SIZE)
      
      console.log(`📦 Batch ${batchNumber}/${totalBatches} (${batch.length} stocks)`)
      
      // Process batch in parallel
      const batchPromises = batch.map((symbol: string) => downloadStockData(symbol))
      await Promise.all(batchPromises)
      
      stats.processed += batch.length
      
      // Log progress
      const progressPct = Math.round((stats.processed / stats.totalStocks) * 100)
      const successRate = Math.round((stats.successful / stats.processed) * 100)
      console.log(`   Progress: ${stats.processed}/${stats.totalStocks} (${progressPct}%)`)
      console.log(`   Success: ${stats.successful}, Skipped: ${stats.skipped}, Failed: ${stats.failed} (${successRate}% success rate)`)
      console.log()
      
      // Update database progress after each batch
      try {
        await prisma.dataRefreshLog.update({
          where: { id: refreshLog.id },
          data: {
            stocksProcessed: stats.processed,
            stocksUpdated: stats.successful,
            stocksSkipped: stats.skipped,
            stocksFailed: stats.failed,
          },
        })
      } catch (updateError) {
        console.error('⚠️  Failed to update progress log:', updateError)
        // Continue anyway - progress tracking is not critical
      }
      
      // Delay between batches (except last)
      if (i + CONFIG.BATCH_SIZE < symbols.length) {
        await sleep(CONFIG.BATCH_DELAY_MS)
      }
    }
    
    // Mark as completed
    stats.endTime = new Date()
    await prisma.dataRefreshLog.update({
      where: { id: refreshLog.id },
      data: {
        status: 'COMPLETED',
        endTime: stats.endTime,
        stocksProcessed: stats.processed,
        stocksUpdated: stats.successful,
        stocksSkipped: stats.skipped,
        stocksFailed: stats.failed,
      },
    })
    
    // Print summary
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║  Download Complete!                                        ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log()
    console.log(`⏱️  Duration: ${Math.round((stats.endTime.getTime() - stats.startTime.getTime()) / 1000 / 60)} minutes`)
    console.log(`✅ Successful: ${stats.successful}`)
    console.log(`⊘  Skipped: ${stats.skipped}`)
    console.log(`✗  Failed: ${stats.failed}`)
    console.log()
    
    if (stats.errors.length > 0) {
      console.log(`❌ Errors (showing first 10):`)
      stats.errors.slice(0, 10).forEach(e => {
        console.log(`   ${e.symbol}: ${e.error}`)
      })
      console.log()
    }
    
    console.log('🎉 Stock data is now cached locally!')
    console.log('   You can now run instant screening on all stocks.')
    console.log()
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message)
    
    await prisma.dataRefreshLog.update({
      where: { id: refreshLog.id },
      data: {
        status: 'FAILED',
        endTime: new Date(),
        errorMessage: error.message,
        stocksProcessed: stats.processed,
        stocksUpdated: stats.successful,
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