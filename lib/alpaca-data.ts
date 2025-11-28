
import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.resolve(__dirname, '../.env') })

export interface AlpacaBar {
  t: string // timestamp
  o: number // open
  h: number // high
  l: number // low
  c: number // close
  v: number // volume
  n?: number // trade count
  vw?: number // volume weighted average price
}

export interface AlpacaSnapshot {
  symbol: string
  latestTrade?: {
    t: string
    x: string
    p: number
    s: number
  }
  latestQuote?: {
    t: string
    ax: string
    ap: number
    as: number
    bx: string
    bp: number
    bs: number
  }
  minuteBar?: AlpacaBar
  dailyBar?: AlpacaBar
  prevDailyBar?: AlpacaBar
}

export class AlpacaDataClient {
  private apiKey: string
  private secretKey: string
  private dataBaseUrl: string

  constructor() {
    this.apiKey = process.env.ALPACA_API_KEY || ''
    this.secretKey = process.env.ALPACA_SECRET_KEY || ''
    
    // Use the market data API base URL (works for both paper and live)
    this.dataBaseUrl = 'https://data.alpaca.markets'

    if (!this.apiKey || !this.secretKey) {
      throw new Error('Alpaca API credentials not found in environment variables')
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.secretKey,
      'Content-Type': 'application/json',
      ...options.headers,
    }

    try {
      const response = await fetch(`${this.dataBaseUrl}${endpoint}`, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch from Alpaca Data API: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get historical bars for a symbol
   * @param symbol Stock symbol
   * @param timeframe '1Min', '5Min', '15Min', '1Hour', '1Day', etc.
   * @param start Start date in RFC-3339 or YYYY-MM-DD format
   * @param end Optional end date
   * @param limit Optional limit (default 10000, max 10000)
   */
  async getHistoricalBars(
    symbol: string,
    timeframe: string = '1Day',
    start?: string,
    end?: string,
    limit: number = 10000
  ): Promise<AlpacaBar[]> {
    const params = new URLSearchParams()
    if (start) params.append('start', start)
    if (end) params.append('end', end)
    params.append('limit', limit.toString())
    params.append('timeframe', timeframe)
    params.append('feed', 'iex') // Use IEX feed for free tier

    const data = await this.makeRequest(`/v2/stocks/${symbol}/bars?${params.toString()}`)
    return data.bars || []
  }

  /**
   * Get latest snapshot for a symbol (quote, trade, bars)
   */
  async getSnapshot(symbol: string): Promise<AlpacaSnapshot | null> {
    try {
      const data = await this.makeRequest(`/v2/stocks/${symbol}/snapshot?feed=iex`)
      return data
    } catch (error) {
      return null
    }
  }

  /**
   * Get snapshots for multiple symbols (batch request)
   * @param symbols Array of stock symbols
   */
  async getSnapshots(symbols: string[]): Promise<Record<string, AlpacaSnapshot>> {
    if (symbols.length === 0) return {}
    
    try {
      const params = new URLSearchParams()
      params.append('symbols', symbols.join(','))
      params.append('feed', 'iex')
      
      const data = await this.makeRequest(`/v2/stocks/snapshots?${params.toString()}`)
      return data || {}
    } catch (error) {
      console.error(`Failed to fetch snapshots for batch:`, error)
      return {}
    }
  }

  /**
   * Calculate momentum from historical bars
   */
  async calculateMomentum(symbol: string): Promise<{
    momentum3M: number | null
    momentum6M: number | null
    momentum12M: number | null
  }> {
    try {
      // Get 12 months of daily bars
      const twelveMonthsAgo = new Date()
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 13) // Extra month for safety
      
      const bars = await this.getHistoricalBars(
        symbol,
        '1Day',
        twelveMonthsAgo.toISOString().split('T')[0],
        undefined,
        300 // ~12 months of trading days
      )

      if (bars.length < 20) {
        return { momentum3M: null, momentum6M: null, momentum12M: null }
      }

      const currentPrice = bars[bars.length - 1].c
      const price3M = bars[Math.max(0, bars.length - 63)]?.c // ~3 months = 63 trading days
      const price6M = bars[Math.max(0, bars.length - 126)]?.c // ~6 months = 126 trading days
      const price12M = bars[0]?.c // 12 months ago

      return {
        momentum3M: price3M ? ((currentPrice - price3M) / price3M) * 100 : null,
        momentum6M: price6M ? ((currentPrice - price6M) / price6M) * 100 : null,
        momentum12M: price12M ? ((currentPrice - price12M) / price12M) * 100 : null,
      }
    } catch (error) {
      return { momentum3M: null, momentum6M: null, momentum12M: null }
    }
  }

  /**
   * Get basic stock statistics from recent bars
   */
  async getStockStatistics(symbol: string): Promise<{
    avgVolume: number | null
    volatility: number | null
    high52w: number | null
    low52w: number | null
  }> {
    try {
      // Get 52 weeks of daily bars
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      
      const bars = await this.getHistoricalBars(
        symbol,
        '1Day',
        oneYearAgo.toISOString().split('T')[0],
        undefined,
        260 // ~52 weeks = 260 trading days
      )

      if (bars.length < 20) {
        return { avgVolume: null, volatility: null, high52w: null, low52w: null }
      }

      // Calculate average volume
      const avgVolume = bars.reduce((sum, bar) => sum + bar.v, 0) / bars.length

      // Calculate volatility (standard deviation of daily returns)
      const returns = bars.slice(1).map((bar, i) => {
        const prevClose = bars[i].c
        return (bar.c - prevClose) / prevClose
      })
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
      const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100 // Annualized volatility

      // 52-week high and low
      const high52w = Math.max(...bars.map(b => b.h))
      const low52w = Math.min(...bars.map(b => b.l))

      return { avgVolume, volatility, high52w, low52w }
    } catch (error) {
      return { avgVolume: null, volatility: null, high52w: null, low52w: null }
    }
  }
}

// Export a singleton instance
export const alpacaDataClient = new AlpacaDataClient()
