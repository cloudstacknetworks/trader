
export interface WatchlistStock {
  id: string
  ticker: string
  score: number
  peRatio?: number
  psRatio?: number
  momentum?: number
  marketCap?: number
  currentPrice?: number
  earningsDate?: Date
  newsCount: number
  sentimentScore?: number
  dateAdded: Date
  screen?: {
    name: string
  }
}

export interface Position {
  id: string
  ticker: string
  quantity: number
  entryPrice: number
  currentPrice?: number
  unrealizedPnl: number
  trailingStopPrice?: number
  entryTime: Date
  status: 'OPEN' | 'CLOSED' | 'PENDING'
}

export interface Trade {
  id: string
  ticker: string
  quantity: number
  entryPrice: number
  exitPrice?: number
  realizedPnl: number
  entryTime: Date
  exitTime?: Date
  holdTimeMinutes?: number
  exitReason?: 'STOP_LOSS' | 'NEGATIVE_NEWS' | 'TIME_CUTOFF' | 'MANUAL' | 'PROFIT_TARGET'
  strategy?: string
}

export interface TradingAccount {
  id: string
  alpacaApiKey?: string
  alpacaSecretKey?: string
  isPaperTrading: boolean
  startingCapital: number
  currentValue: number
  totalPnl: number
  maxPositions: number
  trailingStopPct: number
  timeCutoffHour: number
  timeCutoffMin: number
  automationEnabled: boolean
  emailNotifications: boolean
}

export interface Screen {
  id: string
  name: string
  description?: string
  
  // Valuation Metrics
  minPE?: number
  maxPE?: number
  minPS?: number
  maxPS?: number
  minPB?: number
  maxPB?: number
  minPCF?: number
  maxPCF?: number
  
  // Financial Health
  minROE?: number
  maxROE?: number
  minDebtToEquity?: number
  maxDebtToEquity?: number
  minCurrentRatio?: number
  maxCurrentRatio?: number
  
  // Growth Metrics
  minRevenueGrowth?: number
  maxRevenueGrowth?: number
  minEarningsGrowth?: number
  maxEarningsGrowth?: number
  
  // Income Metrics
  minDividendYield?: number
  maxDividendYield?: number
  
  // Market Metrics
  minMarketCap?: number
  maxMarketCap?: number
  minVolume?: number
  maxVolume?: number
  minMomentum?: number
  maxMomentum?: number
  
  // Legacy fields for backward compatibility
  peRatioMax?: number
  psRatioMax?: number
  momentumMin?: number
  marketCapMin?: number
  
  isActive: boolean
}

export interface NewsItem {
  id: string
  ticker: string
  headline: string
  summary?: string
  url?: string
  source?: string
  publishedAt: Date
  sentimentScore?: number
  category?: string
  relevanceScore?: number
}

export interface BacktestResult {
  totalReturn: number
  winRate: number
  totalTrades: number
  avgGain: number
  avgLoss: number
  bestTrade: number
  worstTrade: number
  maxDrawdown: number
  sharpeRatio?: number
}

export interface ScheduledJob {
  id: string
  name: string
  cronExpression: string
  isEnabled: boolean
  lastRun?: Date
  nextRun?: Date
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  errorMessage?: string
  runCount: number
}

export interface StockData {
  symbol: string
  companyName?: string
  sector?: string
  industry?: string
  currentPrice?: number
  volume?: bigint
  marketCap?: number
  peRatio?: number
  psRatio?: number
  pbRatio?: number
  roe?: number
  debtToEquity?: number
  currentRatio?: number
  revenueGrowth?: number
  earningsGrowth?: number
  dividendYield?: number
  momentum1M?: number
  momentum3M?: number
  momentum6M?: number
  lastUpdated: Date
  dataQuality: number
  hasError: boolean
}

export interface DataRefreshLog {
  id: string
  refreshType: 'INITIAL_LOAD' | 'FULL_REFRESH' | 'DELTA_REFRESH' | 'MANUAL_REFRESH'
  startTime: Date
  endTime?: Date
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  stocksProcessed: number
  stocksUpdated: number
  stocksSkipped: number
  stocksFailed: number
  errorMessage?: string
}
