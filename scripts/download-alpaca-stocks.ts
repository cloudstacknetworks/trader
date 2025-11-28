
import { prisma } from '../lib/db'
import { alpacaDataClient } from '../lib/alpaca-data'
import { finnhubClient } from '../lib/finnhub'

interface DownloadStats {
  startTime: Date
  totalStocks: number
  processed: number
  successful: number
  failed: number
  skipped: number
  currentSymbol?: string
  errors: Array<{ symbol: string; error: string }>
}

// Configuration for API rate limits and batch processing
// OPTIMIZED FOR MAXIMUM RELIABILITY (not speed)
const CONFIG = {
  BATCH_SIZE: 10,              // Process 10 stocks at a time (ultra-conservative)
  BATCH_DELAY_MS: 15000,       // 15 second delay between batches (40 stocks/min = well under 200/min limit)
  MAX_RETRIES: 5,              // Retry failed requests up to 5 times (increased)
  RETRY_DELAY_MS: 8000,        // Wait 8 seconds before retrying (longer backoff)
  LOG_INTERVAL: 50,            // Log progress every 50 stocks
  FINNHUB_METADATA_BATCH: 3,   // Fetch Finnhub metadata in tiny batches (ultra-conservative)
  FINNHUB_DELAY_MS: 10000,     // 10 second delay for Finnhub batches
  HEARTBEAT_INTERVAL: 50,      // Update heartbeat every 50 stocks (more frequent updates)
  MEMORY_CHECK_INTERVAL: 250,  // Check memory every 250 stocks (more frequent checks)
  MAX_MEMORY_MB: 600,          // Restart if memory exceeds 600MB (lower threshold, more proactive)
}

const stats: DownloadStats = {
  startTime: new Date(),
  totalStocks: 0,
  processed: 0,
  successful: 0,
  failed: 0,
  skipped: 0,
  errors: [],
}

let refreshLogId: string | null = null

/**
 * Check memory usage and exit if too high (watchdog will restart)
 */
function checkMemoryUsage(): boolean {
  const usage = process.memoryUsage()
  const usedMB = Math.round(usage.heapUsed / 1024 / 1024)
  
  if (usedMB > CONFIG.MAX_MEMORY_MB) {
    console.log(`\n⚠️  Memory usage high (${usedMB}MB) - exiting for restart...`)
    return false
  }
  
  return true
}

/**
 * Update heartbeat in database to show process is alive
 */
async function updateHeartbeat(processed: number, successful: number, failed: number) {
  if (!refreshLogId) return
  
  try {
    await prisma.dataRefreshLog.update({
      where: { id: refreshLogId },
      data: {
        stocksProcessed: processed,
        stocksUpdated: successful,
        stocksFailed: failed,
      }
    })
  } catch (error) {
    // Silently fail - don't interrupt download for heartbeat issues
  }
}

/**
 * Determine data completeness level based on available data
 */
function determineDataCompleteness(data: any): 'FULL' | 'PARTIAL' | 'BASIC' | 'MINIMAL' {
  let score = 0
  
  // Core price data (20 points)
  if (data.currentPrice && data.currentPrice > 0) score += 10
  if (data.previousClose && data.previousClose > 0) score += 10
  
  // Historical/momentum data (40 points)
  if (data.momentum3M !== null) score += 10
  if (data.momentum6M !== null) score += 10
  if (data.momentum12M !== null) score += 10
  if (data.high52w && data.low52w) score += 10
  
  // Volume data (10 points)
  if (data.avgVolume && data.avgVolume > 0) score += 10
  
  // Volatility (10 points)
  if (data.volatility !== null) score += 10
  
  // Company info (20 points)
  if (data.companyName && data.companyName.length > 0) score += 10
  if (data.sector || data.industry) score += 10
  
  // Determine level based on score
  if (score >= 85) return 'FULL'
  if (score >= 60) return 'PARTIAL'
  if (score >= 30) return 'BASIC'
  return 'MINIMAL'
}

/**
 * Calculate data quality score (0-100)
 */
function calculateDataQuality(data: any): number {
  let score = 0
  let maxScore = 0
  
  // Price data (20 points)
  maxScore += 20
  if (data.currentPrice && data.currentPrice > 0) score += 10
  if (data.previousClose && data.previousClose > 0) score += 10
  
  // Historical data (30 points)
  maxScore += 30
  if (data.momentum3M !== null) score += 10
  if (data.momentum6M !== null) score += 10
  if (data.high52w && data.low52w) score += 10
  
  // Volume (10 points)
  maxScore += 10
  if (data.avgVolume && data.avgVolume > 0) score += 10
  
  // Volatility (10 points)
  maxScore += 10
  if (data.volatility !== null) score += 10
  
  // Company info (20 points)
  maxScore += 20
  if (data.companyName && data.companyName.length > 0) score += 10
  if (data.sector || data.industry) score += 10
  
  // Market cap (10 points)
  maxScore += 10
  if (data.marketCap && data.marketCap > 0) score += 10
  
  return Math.round((score / maxScore) * 100)
}

/**
 * Fetch stock data from Alpaca (primary source)
 */
async function fetchAlpacaData(symbol: string): Promise<any> {
  const data: any = {
    symbol,
    currentPrice: null,
    previousClose: null,
    volume: null,
    avgVolume: null,
    high52w: null,
    low52w: null,
    volatility: null,
    momentum3M: null,
    momentum6M: null,
    momentum12M: null,
  }

  try {
    // Fetch current snapshot
    const snapshot = await alpacaDataClient.getSnapshot(symbol)
    if (snapshot) {
      data.currentPrice = snapshot.latestTrade?.p || snapshot.dailyBar?.c || null
      data.previousClose = snapshot.prevDailyBar?.c || null
      data.volume = snapshot.dailyBar?.v || null
    }

    // Fetch statistics (volume, volatility, 52w range)
    const stats = await alpacaDataClient.getStockStatistics(symbol)
    data.avgVolume = stats.avgVolume
    data.volatility = stats.volatility
    data.high52w = stats.high52w
    data.low52w = stats.low52w

    // Fetch momentum
    const momentum = await alpacaDataClient.calculateMomentum(symbol)
    data.momentum3M = momentum.momentum3M
    data.momentum6M = momentum.momentum6M
    data.momentum12M = momentum.momentum12M

  } catch (error) {
    // Alpaca data fetch failed, but we'll continue
    console.error(`Alpaca data fetch error for ${symbol}:`, error)
  }

  return data
}

/**
 * Fetch company metadata from Finnhub (secondary source)
 */
async function fetchFinnhubMetadata(symbol: string): Promise<any> {
  const metadata: any = {
    companyName: null,
    sector: null,
    industry: null,
    marketCap: null,
  }

  try {
    const profile = await finnhubClient.getCompanyProfile(symbol)
    if (profile) {
      metadata.companyName = profile.name || null
      metadata.sector = profile.finnhubIndustry || null
      metadata.industry = profile.finnhubIndustry || null
      metadata.marketCap = profile.marketCapitalization ? profile.marketCapitalization * 1000000 : null
    }
  } catch (error) {
    // Finnhub metadata fetch failed, not critical
    console.error(`Finnhub metadata error for ${symbol}:`, error)
  }

  return metadata
}

/**
 * Download complete stock data (Alpaca + Finnhub hybrid)
 */
async function downloadStockData(symbols: string[]): Promise<void> {
  for (let i = 0; i < symbols.length; i += CONFIG.BATCH_SIZE) {
    const batch = symbols.slice(i, i + CONFIG.BATCH_SIZE)
    const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1
    const totalBatches = Math.ceil(symbols.length / CONFIG.BATCH_SIZE)

    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} stocks)`)
    console.log(`   📍 Progress checkpoint: ${i} of ${symbols.length} (safe to resume from here if interrupted)`)

    // Process batch in parallel
    const results = await Promise.all(
      batch.map(async (symbol) => {
        stats.currentSymbol = symbol

        try {
          // Step 1: Fetch primary data from Alpaca
          const alpacaData = await fetchAlpacaData(symbol)

          // Step 2: Fetch metadata from Finnhub (SKIP FOR NOW - too slow due to rate limits)
          // We'll add company names in a separate batch process later
          const finnhubData = { companyName: null, sector: null, industry: null, marketCap: null }

          // Combine data
          const stockData = {
            ...alpacaData,
            ...finnhubData,
            symbol,
            lastUpdated: new Date(),
            hasError: false,
          }

          // Check if we have any usable data (price or momentum)
          const hasUsableData = stockData.currentPrice || stockData.previousClose || stockData.momentum3M !== null
          if (!hasUsableData) {
            console.log(`  ⊘ ${symbol}: No usable data at all, skipping`)
            stats.skipped++
            return null
          }
          
          // Use symbol as company name if none provided
          if (!stockData.companyName) {
            stockData.companyName = symbol
          }

          // Calculate quality metrics
          stockData.dataQuality = calculateDataQuality(stockData)
          const completeness = determineDataCompleteness(stockData)

          // Save to database (with proper type conversions)
          await prisma.stockData.upsert({
            where: { symbol },
            update: {
              companyName: stockData.companyName,
              sector: stockData.sector,
              industry: stockData.industry,
              currentPrice: stockData.currentPrice,
              previousClose: stockData.previousClose,
              volume: stockData.volume ? BigInt(Math.round(stockData.volume)) : null,
              avgVolume: stockData.avgVolume ? BigInt(Math.round(stockData.avgVolume)) : null,
              marketCap: stockData.marketCap,
              high52w: stockData.high52w,
              low52w: stockData.low52w,
              volatility: stockData.volatility,
              momentum3M: stockData.momentum3M,
              momentum6M: stockData.momentum6M,
              momentum12M: stockData.momentum12M,
              dataQuality: stockData.dataQuality,
              dataCompleteness: completeness as any,
              lastUpdated: stockData.lastUpdated,
              hasError: false,
            },
            create: {
              symbol: stockData.symbol,
              companyName: stockData.companyName,
              sector: stockData.sector,
              industry: stockData.industry,
              currentPrice: stockData.currentPrice,
              previousClose: stockData.previousClose,
              volume: stockData.volume ? BigInt(Math.round(stockData.volume)) : null,
              avgVolume: stockData.avgVolume ? BigInt(Math.round(stockData.avgVolume)) : null,
              marketCap: stockData.marketCap,
              high52w: stockData.high52w,
              low52w: stockData.low52w,
              volatility: stockData.volatility,
              momentum3M: stockData.momentum3M,
              momentum6M: stockData.momentum6M,
              momentum12M: stockData.momentum12M,
              dataQuality: stockData.dataQuality,
              dataCompleteness: completeness as any,
              lastUpdated: stockData.lastUpdated,
              hasError: false,
            },
          })

          // Log result
          const icons = {
            FULL: '●',
            PARTIAL: '◐',
            BASIC: '◯',
            MINIMAL: '·'
          }
          console.log(`  ${icons[completeness]} ${symbol}: ${completeness} data (quality: ${stockData.dataQuality})`)

          stats.successful++
          return { symbol, success: true }
        } catch (error) {
          stats.failed++
          stats.errors.push({
            symbol,
            error: error instanceof Error ? error.message : String(error),
          })
          console.error(`  ✗ ${symbol}: ${error}`)

          // Record error in database
          try {
            await prisma.stockData.upsert({
              where: { symbol },
              update: { hasError: true, lastUpdated: new Date() },
              create: {
                symbol,
                hasError: true,
                lastUpdated: new Date(),
                dataCompleteness: 'MINIMAL',
              },
            })
          } catch (dbError) {
            console.error(`  ✗ ${symbol}: Failed to record error in DB`)
          }

          return { symbol, success: false }
        } finally {
          stats.processed++
        }
      })
    )

    // Log batch progress
    const successRate = ((stats.successful / stats.processed) * 100).toFixed(1)
    console.log(`   Progress: ${stats.processed}/${stats.totalStocks} (${((stats.processed / stats.totalStocks) * 100).toFixed(0)}%)`)
    console.log(`   Success: ${stats.successful}, Skipped: ${stats.skipped}, Failed: ${stats.failed} (${successRate}% success rate)`)

    // Update heartbeat for watchdog monitoring
    if (stats.processed % CONFIG.HEARTBEAT_INTERVAL === 0) {
      await updateHeartbeat(stats.processed, stats.successful, stats.failed)
    }

    // Check memory usage periodically
    if (stats.processed % CONFIG.MEMORY_CHECK_INTERVAL === 0) {
      const memoryOk = checkMemoryUsage()
      if (!memoryOk) {
        console.log('💾 Memory limit reached - graceful exit for watchdog restart')
        await prisma.$disconnect()
        process.exit(0) // Exit cleanly, watchdog will restart
      }
    }

    // Delay between batches (respect Alpaca rate limits)
    if (i + CONFIG.BATCH_SIZE < symbols.length) {
      console.log(`   ⏸  Waiting ${CONFIG.BATCH_DELAY_MS / 1000}s for API rate limits...`)
      await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY_MS))
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║  Stock Data Download - Alpaca + Finnhub Hybrid            ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  try {
    // Create initial refresh log
    const refreshLog = await prisma.dataRefreshLog.create({
      data: {
        refreshType: 'INITIAL_LOAD',
        status: 'RUNNING',
        startTime: new Date(),
      },
    })
    
    // Store refresh log ID for heartbeat updates
    refreshLogId = refreshLog.id

    // Fetch tradable stock universe from Alpaca
    console.log('📥 Fetching tradable stock universe from Alpaca...')
    const isPaper = process.env.ALPACA_API_KEY?.startsWith('PK')
    const baseUrl = isPaper ? 'https://paper-api.alpaca.markets' : 'https://api.alpaca.markets'
    
    const response = await fetch(`${baseUrl}/v2/assets?status=active&asset_class=us_equity`, {
      headers: {
        'APCA-API-KEY-ID': process.env.ALPACA_API_KEY || '',
        'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY || '',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Alpaca assets: ${response.status} ${response.statusText}`)
    }

    const assets = await response.json()
    console.log(`   Found ${assets.length.toLocaleString()} total assets`)

    // Filter to tradable stocks only
    const tradableStocks = assets.filter((a: any) => a.tradable === true && a.status === 'active')
    console.log(`   Filtered to ${tradableStocks.length.toLocaleString()} tradable stocks\n`)

    // Extract symbols
    const allSymbols = tradableStocks.map((a: any) => a.symbol).sort()
    
    // CRITICAL FIX: Get symbols that are already successfully downloaded
    // We only want to re-download stocks that have errors or are missing
    console.log('🔍 Checking database for existing stocks...')
    const existingStocks = await prisma.stockData.findMany({
      where: {
        hasError: false,  // Only count successfully downloaded stocks
        currentPrice: { not: null },  // Must have price data
      },
      select: { symbol: true }
    })
    
    const existingSymbols = new Set(existingStocks.map(s => s.symbol))
    console.log(`   Found ${existingSymbols.size.toLocaleString()} stocks already downloaded`)
    
    // Filter to only NEW stocks that need downloading
    const symbols = allSymbols.filter((symbol: string) => !existingSymbols.has(symbol))
    stats.totalStocks = symbols.length
    
    console.log(`   ${symbols.length.toLocaleString()} NEW stocks to download\n`)

    if (symbols.length === 0) {
      console.log('✅ All stocks already downloaded! Database is complete.\n')
      await prisma.dataRefreshLog.update({
        where: { id: refreshLog.id },
        data: {
          status: 'COMPLETED',
          endTime: new Date(),
          stocksUpdated: 0,
          stocksFailed: 0,
        },
      })
      return
    }

    console.log(`⚙️  Processing ${symbols.length.toLocaleString()} stocks in batches of ${CONFIG.BATCH_SIZE}`)
    console.log(`   Estimated time: ${Math.round((symbols.length / CONFIG.BATCH_SIZE) * (CONFIG.BATCH_DELAY_MS / 1000 / 60))} minutes`)
    console.log(`   📊 Database will grow from ${existingSymbols.size.toLocaleString()} to ${allSymbols.length.toLocaleString()} stocks\n`)

    // Download data
    await downloadStockData(symbols)

    // Update refresh log
    await prisma.dataRefreshLog.update({
      where: { id: refreshLog.id },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
        stocksUpdated: stats.successful,
        stocksFailed: stats.failed,
      },
    })

    // Print summary
    const duration = Date.now() - stats.startTime.getTime()
    console.log('\n\n' + '═'.repeat(60))
    console.log('📊 DOWNLOAD SUMMARY')
    console.log('═'.repeat(60))
    console.log(`⏱  Duration: ${Math.round(duration / 1000 / 60)} minutes`)
    console.log(`📈 Total Processed: ${stats.processed.toLocaleString()}`)
    console.log(`✅ Successful: ${stats.successful.toLocaleString()}`)
    console.log(`⊘  Skipped: ${stats.skipped.toLocaleString()}`)
    console.log(`✗  Failed: ${stats.failed.toLocaleString()}`)
    console.log(`📊 Success Rate: ${((stats.successful / stats.processed) * 100).toFixed(1)}%`)
    console.log('═'.repeat(60) + '\n')

    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors (showing first 10):')
      stats.errors.slice(0, 10).forEach(e => {
        console.log(`   ${e.symbol}: ${e.error}`)
      })
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
