import { prisma } from '../lib/db'
import { finnhubClient } from '../lib/finnhub'
import { alpacaDataClient } from '../lib/alpaca-data'

interface DataSourceComparison {
  source: 'Finnhub' | 'Alpaca'
  symbol: string
  hasPrice: boolean
  hasProfile: boolean
  hasFinancials: boolean
  hasHistoricalPrices: boolean
  hasMomentum: boolean
  dataQuality: number
  errors: string[]
  latencyMs: number
}

const TEST_SYMBOLS = [
  // Large caps
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'JPM', 'V',
  // Mid caps
  'PLTR', 'CRWD', 'SNOW', 'DDOG', 'NET', 'COIN', 'RBLX', 'U', 'DASH', 'ABNB',
  // Small caps
  'SOFI', 'OPEN', 'HOOD', 'UPST', 'LCID', 'RIVN', 'CELH', 'WING', 'BOOT', 'LULU',
  // Penny/OTC (should be challenging)
  'SNDL', 'HITI', 'BBBY', 'GNUS', 'ATOS'
]

async function testFinnhub(symbol: string): Promise<DataSourceComparison> {
  const start = Date.now()
  const result: DataSourceComparison = {
    source: 'Finnhub',
    symbol,
    hasPrice: false,
    hasProfile: false,
    hasFinancials: false,
    hasHistoricalPrices: false,
    hasMomentum: false,
    dataQuality: 0,
    errors: [],
    latencyMs: 0
  }

  try {
    // Test quote
    try {
      const quote = await finnhubClient.getQuote(symbol)
      if (quote && quote.c && quote.c > 0) {
        result.hasPrice = true
        result.dataQuality += 20
      }
    } catch (err) {
      result.errors.push('quote failed')
    }

    // Test profile
    try {
      const profile = await finnhubClient.getCompanyProfile(symbol)
      if (profile && profile.name) {
        result.hasProfile = true
        result.dataQuality += 20
      }
    } catch (err) {
      result.errors.push('profile failed')
    }

    // Test financials
    try {
      const financials = await finnhubClient.getCompanyFinancials(symbol)
      if (financials && financials.metric) {
        result.hasFinancials = true
        result.dataQuality += 30
      }
    } catch (err) {
      result.errors.push('financials failed')
    }

    // Test historical prices
    try {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const prices = await finnhubClient.getHistoricalPrices(
        symbol,
        'D',
        Math.floor(sixMonthsAgo.getTime() / 1000),
        Math.floor(Date.now() / 1000)
      )
      if (prices && prices.c && prices.c.length > 100) {
        result.hasHistoricalPrices = true
        result.hasMomentum = true
        result.dataQuality += 30
      }
    } catch (err) {
      result.errors.push('historical prices failed')
    }

  } catch (err) {
    result.errors.push(`general error: ${err}`)
  }

  result.latencyMs = Date.now() - start
  return result
}

async function testAlpaca(symbol: string): Promise<DataSourceComparison> {
  const start = Date.now()
  const result: DataSourceComparison = {
    source: 'Alpaca',
    symbol,
    hasPrice: false,
    hasProfile: false,
    hasFinancials: false,
    hasHistoricalPrices: false,
    hasMomentum: false,
    dataQuality: 0,
    errors: [],
    latencyMs: 0
  }

  try {
    // Test snapshot (current price)
    try {
      const snapshot = await alpacaDataClient.getSnapshot(symbol)
      if (snapshot && (snapshot.latestTrade?.p || snapshot.dailyBar?.c)) {
        result.hasPrice = true
        result.dataQuality += 20
      } else {
        result.errors.push('no snapshot data')
      }
    } catch (err) {
      result.errors.push('snapshot failed')
    }

    // Note: Alpaca doesn't provide company profiles or financials
    // This is expected and not a failure
    result.errors.push('no profile/financials (expected)')

    // Test historical bars
    try {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const bars = await alpacaDataClient.getHistoricalBars(
        symbol,
        '1Day',
        sixMonthsAgo.toISOString().split('T')[0]
      )
      if (bars && bars.length > 100) {
        result.hasHistoricalPrices = true
        result.dataQuality += 40
      } else if (bars && bars.length > 0) {
        result.hasHistoricalPrices = true
        result.dataQuality += 20
        result.errors.push(`only ${bars.length} bars`)
      } else {
        result.errors.push('no historical bars')
      }
    } catch (err) {
      result.errors.push('historical bars failed')
    }

    // Test momentum calculation
    try {
      const momentum = await alpacaDataClient.calculateMomentum(symbol)
      if (momentum.momentum3M !== null || momentum.momentum6M !== null) {
        result.hasMomentum = true
        result.dataQuality += 20
      } else {
        result.errors.push('no momentum data')
      }
    } catch (err) {
      result.errors.push('momentum failed')
    }

    // Test statistics
    try {
      const stats = await alpacaDataClient.getStockStatistics(symbol)
      if (stats.avgVolume !== null) {
        result.dataQuality += 20
      }
    } catch (err) {
      result.errors.push('statistics failed')
    }

  } catch (err) {
    result.errors.push(`general error: ${err}`)
  }

  result.latencyMs = Date.now() - start
  return result
}

async function compareDataSources() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║  Data Source Comparison: Finnhub vs Alpaca                ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  console.log(`Testing ${TEST_SYMBOLS.length} symbols across both data sources...\n`)

  const results: {
    finnhub: DataSourceComparison[]
    alpaca: DataSourceComparison[]
  } = {
    finnhub: [],
    alpaca: []
  }

  let completedTests = 0

  // Test each symbol with both sources (with delay to respect rate limits)
  for (const symbol of TEST_SYMBOLS) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Testing ${symbol}...`)
    console.log('='.repeat(60))

    // Test Finnhub
    process.stdout.write(`  📊 Finnhub: `)
    const finnhubResult = await testFinnhub(symbol)
    results.finnhub.push(finnhubResult)
    console.log(`Quality=${finnhubResult.dataQuality}%, Latency=${finnhubResult.latencyMs}ms`)
    if (finnhubResult.errors.length > 0) {
      console.log(`     Errors: ${finnhubResult.errors.join(', ')}`)
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Test Alpaca
    process.stdout.write(`  🦙 Alpaca: `)
    const alpacaResult = await testAlpaca(symbol)
    results.alpaca.push(alpacaResult)
    console.log(`Quality=${alpacaResult.dataQuality}%, Latency=${alpacaResult.latencyMs}ms`)
    if (alpacaResult.errors.length > 0 && !alpacaResult.errors.includes('no profile/financials (expected)')) {
      console.log(`     Errors: ${alpacaResult.errors.filter(e => e !== 'no profile/financials (expected)').join(', ')}`)
    }

    completedTests++
    console.log(`\n  Progress: ${completedTests}/${TEST_SYMBOLS.length} (${Math.round(completedTests / TEST_SYMBOLS.length * 100)}%)`)

    // Delay between symbols to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  // Calculate summary statistics
  console.log('\n\n' + '═'.repeat(60))
  console.log('📊 SUMMARY STATISTICS')
  console.log('═'.repeat(60) + '\n')

  const finnhubStats = {
    avgQuality: results.finnhub.reduce((sum, r) => sum + r.dataQuality, 0) / results.finnhub.length,
    avgLatency: results.finnhub.reduce((sum, r) => sum + r.latencyMs, 0) / results.finnhub.length,
    successRate: results.finnhub.filter(r => r.dataQuality > 50).length / results.finnhub.length * 100,
    hasPrice: results.finnhub.filter(r => r.hasPrice).length,
    hasProfile: results.finnhub.filter(r => r.hasProfile).length,
    hasFinancials: results.finnhub.filter(r => r.hasFinancials).length,
    hasHistorical: results.finnhub.filter(r => r.hasHistoricalPrices).length,
    hasMomentum: results.finnhub.filter(r => r.hasMomentum).length,
  }

  const alpacaStats = {
    avgQuality: results.alpaca.reduce((sum, r) => sum + r.dataQuality, 0) / results.alpaca.length,
    avgLatency: results.alpaca.reduce((sum, r) => sum + r.latencyMs, 0) / results.alpaca.length,
    successRate: results.alpaca.filter(r => r.dataQuality > 50).length / results.alpaca.length * 100,
    hasPrice: results.alpaca.filter(r => r.hasPrice).length,
    hasProfile: 0, // Alpaca doesn't provide this
    hasFinancials: 0, // Alpaca doesn't provide this
    hasHistorical: results.alpaca.filter(r => r.hasHistoricalPrices).length,
    hasMomentum: results.alpaca.filter(r => r.hasMomentum).length,
  }

  console.log('FINNHUB:')
  console.log(`  Average Data Quality: ${finnhubStats.avgQuality.toFixed(1)}%`)
  console.log(`  Average Latency: ${finnhubStats.avgLatency.toFixed(0)}ms`)
  console.log(`  Success Rate (>50% quality): ${finnhubStats.successRate.toFixed(1)}%`)
  console.log(`  Has Current Price: ${finnhubStats.hasPrice}/${TEST_SYMBOLS.length}`)
  console.log(`  Has Company Profile: ${finnhubStats.hasProfile}/${TEST_SYMBOLS.length}`)
  console.log(`  Has Financials: ${finnhubStats.hasFinancials}/${TEST_SYMBOLS.length}`)
  console.log(`  Has Historical Prices: ${finnhubStats.hasHistorical}/${TEST_SYMBOLS.length}`)
  console.log(`  Has Momentum: ${finnhubStats.hasMomentum}/${TEST_SYMBOLS.length}`)

  console.log('\nALPACA:')
  console.log(`  Average Data Quality: ${alpacaStats.avgQuality.toFixed(1)}%`)
  console.log(`  Average Latency: ${alpacaStats.avgLatency.toFixed(0)}ms`)
  console.log(`  Success Rate (>50% quality): ${alpacaStats.successRate.toFixed(1)}%`)
  console.log(`  Has Current Price: ${alpacaStats.hasPrice}/${TEST_SYMBOLS.length}`)
  console.log(`  Has Company Profile: N/A (not provided by Alpaca)`)
  console.log(`  Has Financials: N/A (not provided by Alpaca)`)
  console.log(`  Has Historical Prices: ${alpacaStats.hasHistorical}/${TEST_SYMBOLS.length}`)
  console.log(`  Has Momentum: ${alpacaStats.hasMomentum}/${TEST_SYMBOLS.length}`)

  console.log('\n' + '═'.repeat(60))
  console.log('🎯 RECOMMENDATION')
  console.log('═'.repeat(60) + '\n')

  if (finnhubStats.avgQuality > alpacaStats.avgQuality + 20) {
    console.log('✅ FINNHUB is the clear winner')
    console.log('   - Better overall data quality')
    console.log('   - Provides company profiles and financials')
    console.log('   - Better for fundamental analysis')
  } else if (alpacaStats.avgQuality > finnhubStats.avgQuality + 20) {
    console.log('✅ ALPACA is the clear winner')
    console.log('   - Better historical price data')
    console.log('   - Faster API responses')
    console.log('   - Better for technical/momentum strategies')
  } else {
    console.log('🤝 HYBRID APPROACH RECOMMENDED')
    console.log('   - Use Alpaca for: prices, historical data, momentum')
    console.log('   - Use Finnhub for: company info, financials, fundamentals')
    console.log('   - Combine both for best coverage and quality')
  }

  console.log('\n' + '═'.repeat(60))
  console.log('📈 UNIVERSE SIZE COMPARISON')
  console.log('═'.repeat(60))
  console.log(`Alpaca Tradable Universe: ~12,260 stocks`)
  console.log(`Finnhub Common Stocks: ~18,375 symbols`)
  console.log(`Finnhub Quality (estimated): ~1,200-1,800 stocks`)
  console.log(`\n✨ Alpaca provides 6-10x more tradeable stocks than Finnhub quality dataset!`)
  console.log('═'.repeat(60) + '\n')
}

compareDataSources().catch(console.error)
