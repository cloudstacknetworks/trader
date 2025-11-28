
export interface AlpacaConfig {
  apiKey: string
  secretKey: string
  isPaperTrading: boolean
}

export class AlpacaClient {
  private config: AlpacaConfig
  private baseUrl: string

  constructor(config: AlpacaConfig) {
    this.config = config
    this.baseUrl = config.isPaperTrading 
      ? 'https://paper-api.alpaca.markets' 
      : 'https://api.alpaca.markets'
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'APCA-API-KEY-ID': this.config.apiKey,
      'APCA-API-SECRET-KEY': this.config.secretKey,
      'Content-Type': 'application/json',
      ...options.headers,
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Alpaca API error: ${response.status} - ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Alpaca API request failed for ${endpoint}:`, error)
      throw error
    }
  }

  async getAccount() {
    return this.makeRequest('/v2/account')
  }

  async getPositions() {
    return this.makeRequest('/v2/positions')
  }

  async getPosition(symbol: string) {
    return this.makeRequest(`/v2/positions/${symbol}`)
  }

  async getOrders(status?: string) {
    const params = status ? `?status=${status}` : ''
    return this.makeRequest(`/v2/orders${params}`)
  }

  async getOrder(orderId: string) {
    return this.makeRequest(`/v2/orders/${orderId}`)
  }

  async createOrder(orderData: {
    symbol: string
    qty: number
    side: 'buy' | 'sell'
    type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop'
    time_in_force: 'day' | 'gtc' | 'ioc' | 'fok'
    limit_price?: number
    stop_price?: number
    trail_price?: number
    trail_percent?: number
  }) {
    return this.makeRequest('/v2/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    })
  }

  async cancelOrder(orderId: string) {
    return this.makeRequest(`/v2/orders/${orderId}`, {
      method: 'DELETE',
    })
  }

  async cancelAllOrders() {
    return this.makeRequest('/v2/orders', {
      method: 'DELETE',
    })
  }

  async getPortfolioHistory(period?: string, timeframe?: string) {
    const params = new URLSearchParams()
    if (period) params.append('period', period)
    if (timeframe) params.append('timeframe', timeframe)
    
    return this.makeRequest(`/v2/account/portfolio/history?${params.toString()}`)
  }

  async getBars(symbols: string[], timeframe: string, start?: string, end?: string) {
    const params = new URLSearchParams({
      symbols: symbols.join(','),
      timeframe,
    })
    
    if (start) params.append('start', start)
    if (end) params.append('end', end)

    return this.makeRequest(`/v2/stocks/bars?${params.toString()}`)
  }

  async getLatestTrades(symbols: string[]) {
    const params = new URLSearchParams({
      symbols: symbols.join(','),
    })

    return this.makeRequest(`/v2/stocks/trades/latest?${params.toString()}`)
  }

  async getLatestQuotes(symbols: string[]) {
    const params = new URLSearchParams({
      symbols: symbols.join(','),
    })

    return this.makeRequest(`/v2/stocks/quotes/latest?${params.toString()}`)
  }
}

// Helper function to create Alpaca client instance
export function createAlpacaClient(config: AlpacaConfig): AlpacaClient {
  return new AlpacaClient(config)
}
