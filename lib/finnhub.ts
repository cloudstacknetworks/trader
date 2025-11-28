
export class FinnhubClient {
  private baseUrl = 'https://finnhub.io/api/v1'

  private get apiKey(): string {
    return process.env.FINNHUB_API_KEY || ''
  }

  async getQuote(ticker: string) {
    try {
      const response = await fetch(
        `${this.baseUrl}/quote?symbol=${ticker}&token=${this.apiKey}`
      )
      if (!response.ok) throw new Error('Failed to fetch quote')
      return await response.json()
    } catch (error) {
      console.error(`Error fetching quote for ${ticker}:`, error)
      return null
    }
  }

  async getCompanyProfile(ticker: string) {
    try {
      const response = await fetch(
        `${this.baseUrl}/stock/profile2?symbol=${ticker}&token=${this.apiKey}`
      )
      if (!response.ok) throw new Error('Failed to fetch company profile')
      return await response.json()
    } catch (error) {
      console.error(`Error fetching profile for ${ticker}:`, error)
      return null
    }
  }

  async getCompanyFinancials(ticker: string, metric = 'all') {
    try {
      const response = await fetch(
        `${this.baseUrl}/stock/metric?symbol=${ticker}&metric=${metric}&token=${this.apiKey}`
      )
      if (!response.ok) throw new Error('Failed to fetch financials')
      return await response.json()
    } catch (error) {
      console.error(`Error fetching financials for ${ticker}:`, error)
      return null
    }
  }

  async getCompanyNews(ticker: string, from: string, to: string) {
    try {
      const response = await fetch(
        `${this.baseUrl}/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${this.apiKey}`
      )
      if (!response.ok) throw new Error('Failed to fetch news')
      return await response.json()
    } catch (error) {
      console.error(`Error fetching news for ${ticker}:`, error)
      return []
    }
  }

  async getNewsSentiment(ticker: string) {
    try {
      const response = await fetch(
        `${this.baseUrl}/news-sentiment?symbol=${ticker}&token=${this.apiKey}`
      )
      if (!response.ok) throw new Error('Failed to fetch news sentiment')
      return await response.json()
    } catch (error) {
      console.error(`Error fetching news sentiment for ${ticker}:`, error)
      return null
    }
  }

  async getEarningsCalendar(from: string, to: string) {
    try {
      const url = `${this.baseUrl}/calendar/earnings?from=${from}&to=${to}&token=${this.apiKey}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch earnings calendar: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching earnings calendar:', error)
      return { earningsCalendar: [] } // Graceful fallback
    }
  }

  async getStockSymbols(exchange = 'US') {
    try {
      const url = `${this.baseUrl}/stock/symbol?exchange=${exchange}&token=${this.apiKey}`
      const response = await fetch(url)
      
      if (!response.ok) {
        const text = await response.text()
        console.error(`Finnhub API error (${response.status}):`, text)
        throw new Error(`Failed to fetch stock symbols: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching stock symbols:', error)
      return []
    }
  }

  async getHistoricalPrices(ticker: string, resolution: string, from: number, to: number) {
    try {
      const response = await fetch(
        `${this.baseUrl}/stock/candle?symbol=${ticker}&resolution=${resolution}&from=${from}&to=${to}&token=${this.apiKey}`
      )
      if (!response.ok) throw new Error('Failed to fetch historical prices')
      const data = await response.json()
      
      // Finnhub returns {s: 'no_data'} if there's no data
      if (data.s === 'no_data') return null
      
      return data
    } catch (error) {
      console.error(`Error fetching historical prices for ${ticker}:`, error)
      return null
    }
  }

  async getCompanyEarnings(ticker: string, limit: number = 4) {
    try {
      const response = await fetch(
        `${this.baseUrl}/stock/earnings?symbol=${ticker}&limit=${limit}&token=${this.apiKey}`
      )
      if (!response.ok) throw new Error('Failed to fetch company earnings')
      return await response.json()
    } catch (error) {
      console.error(`Error fetching earnings for ${ticker}:`, error)
      return null
    }
  }
}

export const finnhubClient = new FinnhubClient()
