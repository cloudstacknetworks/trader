
import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.resolve(__dirname, '../.env') })

interface AlpacaAsset {
  id: string
  class: string
  exchange: string
  symbol: string
  name: string
  status: string
  tradable: boolean
  marginable: boolean
  maintenance_margin_requirement: number
  shortable: boolean
  easy_to_borrow: boolean
  fractionable: boolean
  attributes: string[]
}

async function testAlpacaUniverse() {
  const apiKey = process.env.ALPACA_API_KEY
  const secretKey = process.env.ALPACA_SECRET_KEY
  
  if (!apiKey || !secretKey) {
    console.error('❌ Alpaca API credentials not found in .env')
    console.log('Please add:')
    console.log('  ALPACA_API_KEY=your_key')
    console.log('  ALPACA_SECRET_KEY=your_secret')
    return
  }

  // Keys starting with 'PK' are paper trading keys
  const isPaper = apiKey.startsWith('PK') || process.env.ALPACA_IS_PAPER === 'true'
  
  const baseUrl = isPaper
    ? 'https://paper-api.alpaca.markets'
    : 'https://api.alpaca.markets'

  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║  Alpaca Assets Universe Test                              ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')
  console.log(`🔗 Using ${isPaper ? 'Paper' : 'Live'} API`)
  console.log(`🔗 Base URL: ${baseUrl}\n`)

  try {
    // Fetch all US equity assets
    console.log('📥 Fetching all US equity assets...')
    const response = await fetch(`${baseUrl}/v2/assets?status=active&asset_class=us_equity`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const assets: AlpacaAsset[] = await response.json()

    console.log(`✅ Received ${assets.length.toLocaleString()} total assets\n`)

    // Filter to tradable stocks
    const tradableStocks = assets.filter(a => a.tradable === true && a.status === 'active')
    console.log(`📊 Analysis:`)
    console.log(`   Total assets: ${assets.length.toLocaleString()}`)
    console.log(`   Tradable stocks: ${tradableStocks.length.toLocaleString()}`)
    console.log(`   Non-tradable: ${(assets.length - tradableStocks.length).toLocaleString()}\n`)

    // Breakdown by exchange
    const byExchange: Record<string, number> = {}
    tradableStocks.forEach(a => {
      byExchange[a.exchange] = (byExchange[a.exchange] || 0) + 1
    })

    console.log('📍 Tradable stocks by exchange:')
    Object.entries(byExchange)
      .sort((a, b) => b[1] - a[1])
      .forEach(([exchange, count]) => {
        console.log(`   ${exchange}: ${count.toLocaleString()}`)
      })

    // Additional attributes
    const marginable = tradableStocks.filter(a => a.marginable).length
    const shortable = tradableStocks.filter(a => a.shortable).length
    const fractionable = tradableStocks.filter(a => a.fractionable).length

    console.log('\n📋 Stock characteristics:')
    console.log(`   Marginable: ${marginable.toLocaleString()} (${((marginable / tradableStocks.length) * 100).toFixed(1)}%)`)
    console.log(`   Shortable: ${shortable.toLocaleString()} (${((shortable / tradableStocks.length) * 100).toFixed(1)}%)`)
    console.log(`   Fractionable: ${fractionable.toLocaleString()} (${((fractionable / tradableStocks.length) * 100).toFixed(1)}%)`)

    // Sample stocks
    console.log('\n📝 Sample tradable stocks:')
    tradableStocks.slice(0, 10).forEach(a => {
      console.log(`   ${a.symbol.padEnd(6)} - ${a.name.substring(0, 40)} (${a.exchange})`)
    })

    // Test fetching profile for a few stocks
    console.log('\n🧪 Testing data availability for sample stocks...')
    const testSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA']
    
    for (const symbol of testSymbols) {
      try {
        // Test historical bars endpoint
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        
        const barsResponse = await fetch(
          `${baseUrl}/v2/stocks/${symbol}/bars?start=${yesterdayStr}&timeframe=1Day&limit=1`,
          {
            headers: {
              'APCA-API-KEY-ID': apiKey,
              'APCA-API-SECRET-KEY': secretKey,
            },
          }
        )

        if (barsResponse.ok) {
          const barsData = await barsResponse.json()
          console.log(`   ✅ ${symbol}: Has historical data (${barsData.bars?.length || 0} bars)`)
        } else {
          console.log(`   ⚠️  ${symbol}: No historical data (${barsResponse.status})`)
        }
      } catch (error) {
        console.log(`   ❌ ${symbol}: Error fetching data`)
      }
    }

    console.log('\n' + '═'.repeat(62))
    console.log('📊 COMPARISON WITH FINNHUB:')
    console.log('═'.repeat(62))
    console.log(`Alpaca tradable stocks:  ${tradableStocks.length.toLocaleString()}`)
    console.log(`Finnhub common stocks:   ~18,375`)
    console.log(`Finnhub quality stocks:  ~1,200-1,800 (estimated)`)
    console.log('═'.repeat(62))

    if (tradableStocks.length > 10000) {
      console.log('\n✨ EXCELLENT! Alpaca provides a much larger tradable universe!')
    } else if (tradableStocks.length > 5000) {
      console.log('\n✅ GOOD! Alpaca provides a solid tradable universe.')
    } else {
      console.log('\n⚠️  LIMITED! Alpaca universe is smaller than expected.')
    }

  } catch (error) {
    console.error('\n❌ Error testing Alpaca universe:', error)
    if (error instanceof Error) {
      console.error('   Details:', error.message)
    }
  }
}

testAlpacaUniverse()
