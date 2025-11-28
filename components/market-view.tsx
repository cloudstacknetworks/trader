
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, TrendingUp, TrendingDown, Plus, Check, Info, Filter, RefreshCw, Database, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface StockSearchResult {
  symbol: string
  companyName: string | null
  industry: string | null
  currentPrice: number | null
  previousClose: number | null
  marketCap: number | null
  peRatio: number | null
  volume: number | null
  momentum3M: number | null
  priceChange: number | null
  priceChangePercent: number | null
  dataCompleteness?: 'FULL' | 'PARTIAL' | 'BASIC' | 'MINIMAL'
}

interface StockDetail {
  symbol: string
  companyName: string | null
  industry: string | null
  country: string | null
  exchange: string | null
  currentPrice: number | null
  previousClose: number | null
  volume: number | null
  marketCap: number | null
  peRatio: number | null
  psRatio: number | null
  pbRatio: number | null
  priceToCashFlowRatio: number | null
  evToEbitda: number | null
  roe: number | null
  roa: number | null
  debtToEquity: number | null
  currentRatio: number | null
  quickRatio: number | null
  revenueGrowth: number | null
  earningsGrowth: number | null
  dividendYield: number | null
  momentum1M: number | null
  momentum3M: number | null
  momentum6M: number | null
  momentum12M: number | null
  beta: number | null
  fiftyDayMA: number | null
  twoHundredDayMA: number | null
  dataQuality: number | null
  lastUpdated: string
  realTimeQuote: any
  isInWatchlist: boolean
  news: any[]
}

interface DataRefreshStatus {
  isRefreshing: boolean
  refreshType: string | null
  totalStocks: number
  stocksWithData: number
  averageDataQuality: number
  oldestUpdate: string | null
  newestUpdate: string | null
  stocksNeedingUpdate: number
  expectedUniverseSize: number
  currentProgress?: {
    stocksProcessed: number
    successCount: number
    failedCount: number
    totalStocks: number
    isInitialLoad: boolean
  }
}

export function MarketView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExchange, setSelectedExchange] = useState('all')
  const [exchanges, setExchanges] = useState<string[]>([])
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([])
  const [selectedStock, setSelectedStock] = useState<StockDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [error, setError] = useState('')
  const [showStockDetail, setShowStockDetail] = useState(false)
  const [dataStatus, setDataStatus] = useState<DataRefreshStatus | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)

  // Fetch data refresh status
  useEffect(() => {
    const fetchDataStatus = async () => {
      try {
        const response = await fetch('/api/data-refresh')
        if (response.ok) {
          const data = await response.json()
          setDataStatus(data.status)
        }
      } catch (error) {
        console.error('Error fetching data status:', error)
      } finally {
        setIsLoadingStatus(false)
      }
    }
    
    fetchDataStatus()
    // Refresh status every 30 seconds
    const interval = setInterval(fetchDataStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch available exchanges on mount
  useEffect(() => {
    const fetchExchanges = async () => {
      try {
        const response = await fetch('/api/market/exchanges')
        if (response.ok) {
          const data = await response.json()
          setExchanges(data.exchanges || [])
        }
      } catch (error) {
        console.error('Error fetching exchanges:', error)
      }
    }
    fetchExchanges()
  }, [])

  const searchStocks = useCallback(async (query: string, exchange: string = 'all') => {
    if (!query || query.length < 1) {
      setSearchResults([])
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const url = `/api/market/search?q=${encodeURIComponent(query)}&limit=50${exchange && exchange !== 'all' ? `&exchange=${encodeURIComponent(exchange)}` : ''}`
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to search stocks')
      
      const data = await response.json()
      setSearchResults(data.stocks || [])
    } catch (error) {
      console.error('Error searching stocks:', error)
      setError('Failed to search stocks. Please try again.')
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchStocks(searchQuery, selectedExchange)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, selectedExchange, searchStocks])

  const fetchStockDetail = async (symbol: string) => {
    setIsLoadingDetail(true)
    setError('')

    try {
      const response = await fetch(`/api/market/${symbol}`)
      if (!response.ok) throw new Error('Failed to fetch stock details')
      
      const data = await response.json()
      setSelectedStock(data)
      setShowStockDetail(true)
    } catch (error) {
      console.error('Error fetching stock details:', error)
      setError('Failed to fetch stock details. Please try again.')
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const formatNumber = (num: number | null, decimals: number = 2) => {
    if (num === null || num === undefined) return 'N/A'
    return num.toFixed(decimals)
  }

  const formatCurrency = (num: number | null) => {
    if (num === null || num === undefined) return 'N/A'
    return `$${num.toFixed(2)}`
  }

  const formatMarketCap = (num: number | null) => {
    if (num === null || num === undefined) return 'N/A'
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    return `$${num.toFixed(0)}`
  }

  const formatVolume = (num: number | null) => {
    if (num === null || num === undefined) return 'N/A'
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
    return num.toFixed(0)
  }

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  }

  const getDataFreshness = () => {
    // During initial download, database is NOT up to date
    if (dataStatus?.isRefreshing && dataStatus?.currentProgress?.isInitialLoad) {
      return 'downloading'
    }
    
    // Check if database is substantially incomplete (< 90% of expected universe)
    const completionPercent = (dataStatus?.totalStocks || 0) / (dataStatus?.expectedUniverseSize || 12260) * 100
    if (completionPercent < 90) {
      return 'incomplete'
    }
    
    if (!dataStatus?.newestUpdate) return 'unknown'
    const date = new Date(dataStatus.newestUpdate)
    const now = new Date()
    const diffHours = (now.getTime() - date.getTime()) / 3600000
    
    if (diffHours < 24) return 'fresh'
    if (diffHours < 48) return 'recent'
    return 'stale'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Market Search</h1>
          <p className="text-gray-500 mt-1">Search and explore stocks from the entire market</p>
        </div>
      </div>

      {/* Data Status Banner */}
      {!isLoadingStatus && dataStatus && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Status Overview */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Database Status</h3>
                    {dataStatus.isRefreshing && (
                      <Badge variant="outline" className="gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        {dataStatus.refreshType === 'INITIAL_LOAD' ? 'Initial Download' : 'Refreshing'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {dataStatus.currentProgress?.isInitialLoad ? (
                      // During initial download, show progress vs expected universe
                      <>
                        {dataStatus.currentProgress.stocksProcessed.toLocaleString()} of ~{dataStatus.expectedUniverseSize.toLocaleString()} stocks processed
                        <span className="ml-2 text-blue-600 font-medium">
                          ({Math.round((dataStatus.currentProgress.stocksProcessed / dataStatus.expectedUniverseSize) * 100)}% complete)
                        </span>
                      </>
                    ) : (
                      // After download, show final counts
                      <>
                        {dataStatus.stocksWithData.toLocaleString()} stocks in database
                        {dataStatus.newestUpdate && (
                          <span className="ml-2">• Last updated {formatTimeAgo(dataStatus.newestUpdate)}</span>
                        )}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {(() => {
                    const freshness = getDataFreshness()
                    
                    if (freshness === 'downloading') {
                      return (
                        <Badge variant="outline" className="gap-1 border-blue-500 text-blue-700">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Downloading
                        </Badge>
                      )
                    }
                    
                    if (freshness === 'incomplete') {
                      const percent = Math.round((dataStatus.totalStocks || 0) / (dataStatus.expectedUniverseSize || 12260) * 100)
                      return (
                        <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-700">
                          <Clock className="h-3 w-3" />
                          {percent}% Complete
                        </Badge>
                      )
                    }
                    
                    return (
                      <Badge 
                        variant={freshness === 'fresh' ? 'default' : freshness === 'recent' ? 'secondary' : 'destructive'}
                        className="gap-1"
                      >
                        <Clock className="h-3 w-3" />
                        {freshness === 'fresh' ? 'Up to date' : freshness === 'recent' ? 'Recent' : 'Needs update'}
                      </Badge>
                    )
                  })()}
                  {dataStatus.stocksNeedingUpdate > 0 && !dataStatus.isRefreshing && (
                    <span className="text-xs text-gray-500">
                      {dataStatus.stocksNeedingUpdate} stocks need update
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar - Show during initial download or refresh */}
              {dataStatus.isRefreshing && dataStatus.currentProgress && (
                <div className="space-y-2">
                  <Progress 
                    value={dataStatus.currentProgress.isInitialLoad 
                      ? (dataStatus.currentProgress.stocksProcessed / dataStatus.expectedUniverseSize) * 100
                      : (dataStatus.currentProgress.stocksProcessed / dataStatus.currentProgress.totalStocks) * 100
                    } 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>
                      {dataStatus.currentProgress.isInitialLoad 
                        ? `Processing: ${dataStatus.currentProgress.stocksProcessed.toLocaleString()} / ~${dataStatus.expectedUniverseSize.toLocaleString()}`
                        : `Processing: ${dataStatus.currentProgress.stocksProcessed.toLocaleString()} / ${dataStatus.currentProgress.totalStocks.toLocaleString()}`
                      }
                    </span>
                    <span>
                      Success: {dataStatus.currentProgress.successCount.toLocaleString()} • 
                      Failed: {dataStatus.currentProgress.failedCount.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Info Messages */}
              {dataStatus.isRefreshing && dataStatus.refreshType === 'INITIAL_LOAD' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Initial download in progress. This may take 2-4 hours to complete. 
                    You can search stocks as they become available.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search by ticker symbol or company name... (e.g., AAPL, Apple, Tesla)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-lg"
                />
              </div>
              <div className="w-64">
                <Select value={selectedExchange} onValueChange={setSelectedExchange}>
                  <SelectTrigger className="h-12">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-400" />
                      <SelectValue placeholder="All Exchanges" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Exchanges</SelectItem>
                    {exchanges.map((exchange) => (
                      <SelectItem key={exchange} value={exchange}>
                        {exchange}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isLoading && (
              <p className="text-sm text-gray-500">Searching...</p>
            )}
            {selectedExchange !== 'all' && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Filter className="h-3 w-3" />
                  Exchange: {selectedExchange}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results ({searchResults.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertDescription className="text-sm">
                <strong>Data Completeness Levels:</strong> Stocks with <Badge variant="secondary" className="mx-1 text-xs">◐ Partial Data</Badge> 
                have price, volume, and market cap - suitable for earnings/news trading with limited screening. 
                <Badge variant="outline" className="mx-1 text-xs">◯ Basic</Badge> and 
                <Badge variant="outline" className="mx-1 text-xs">· Minimal</Badge> stocks have only price data - 
                <strong>best for pure earnings beats or news-driven trades</strong>. FULL data stocks (no badge) support all O'Shaughnessy screening criteria.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              {searchResults.map((stock) => (
                <div
                  key={stock.symbol}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => fetchStockDetail(stock.symbol)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{stock.symbol}</h3>
                      {stock.companyName && (
                        <span className="text-sm text-gray-600">{stock.companyName}</span>
                      )}
                      {stock.dataCompleteness && stock.dataCompleteness !== 'FULL' && (
                        <Badge 
                          variant={
                            stock.dataCompleteness === 'PARTIAL' ? 'secondary' : 
                            stock.dataCompleteness === 'BASIC' ? 'outline' : 
                            'outline'
                          }
                          className="text-xs"
                        >
                          {stock.dataCompleteness === 'PARTIAL' && '◐ Partial Data'}
                          {stock.dataCompleteness === 'BASIC' && '◯ Basic Data Only'}
                          {stock.dataCompleteness === 'MINIMAL' && '· Minimal Data'}
                        </Badge>
                      )}
                    </div>
                    {stock.industry && (
                      <p className="text-xs text-gray-500 mt-1">{stock.industry}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-6">
                    {stock.currentPrice && (
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(stock.currentPrice)}
                        </p>
                        {stock.priceChange !== null && stock.priceChangePercent !== null && (
                          <div className={`flex items-center gap-1 text-sm ${
                            stock.priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {stock.priceChange >= 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            <span>
                              {formatCurrency(Math.abs(stock.priceChange))} (
                              {formatNumber(stock.priceChangePercent, 2)}%)
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {stock.marketCap && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Market Cap</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatMarketCap(stock.marketCap)}
                        </p>
                      </div>
                    )}

                    {stock.peRatio && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">P/E</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatNumber(stock.peRatio)}
                        </p>
                      </div>
                    )}

                    <Button variant="outline" size="sm">
                      <Info className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && searchQuery && searchResults.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No stocks found matching "{searchQuery}"</p>
            <p className="text-sm text-gray-400 mt-2">
              Try searching by ticker symbol (e.g., AAPL) or company name (e.g., Apple)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Initial State */}
      {!searchQuery && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Start typing to search for stocks</p>
            <p className="text-sm text-gray-400 mt-2">
              Search by ticker symbol (e.g., AAPL, TSLA) or company name (e.g., Apple, Tesla)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stock Detail Dialog */}
      {selectedStock && (
        <Dialog open={showStockDetail} onOpenChange={setShowStockDetail}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold">{selectedStock.symbol}</span>
                    {selectedStock.companyName && (
                      <span className="text-lg text-gray-600">{selectedStock.companyName}</span>
                    )}
                  </div>
                  {selectedStock.industry && (
                    <p className="text-sm text-gray-500 mt-1">{selectedStock.industry}</p>
                  )}
                </div>
                <Badge variant={selectedStock.isInWatchlist ? 'default' : 'outline'}>
                  {selectedStock.isInWatchlist ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      In Watchlist
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Add to Watchlist
                    </>
                  )}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Company Basics */}
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Company</p>
                      <p className="text-sm font-medium">{selectedStock.companyName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Industry</p>
                      <p className="text-sm font-medium">{selectedStock.industry || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Country</p>
                      <p className="text-sm font-medium">{selectedStock.country || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Exchange</p>
                      <p className="text-sm font-medium">{selectedStock.exchange || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Price Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-gray-500 mb-1">Current Price</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(selectedStock.currentPrice)}
                    </p>
                    {selectedStock.realTimeQuote && (
                      <p className={`text-sm mt-1 ${
                        selectedStock.realTimeQuote.d >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedStock.realTimeQuote.d >= 0 ? '+' : ''}
                        {formatCurrency(selectedStock.realTimeQuote.d)} (
                        {formatNumber(selectedStock.realTimeQuote.dp, 2)}%)
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-gray-500 mb-1">Previous Close</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {formatCurrency(selectedStock.previousClose)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-gray-500 mb-1">Market Cap</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {formatMarketCap(selectedStock.marketCap)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-gray-500 mb-1">Volume</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {formatVolume(selectedStock.volume)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Price Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Price Trend (6 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-between gap-1">
                    {(() => {
                      // Generate simple momentum-based trend visualization
                      const momentum = [
                        selectedStock.momentum6M || 0,
                        selectedStock.momentum3M || 0,
                        selectedStock.momentum1M || 0
                      ]
                      const currentPrice = selectedStock.currentPrice || 0
                      const maxHeight = 100
                      
                      // Create 24 bars (weekly data points for 6 months)
                      const bars = []
                      for (let i = 0; i < 24; i++) {
                        const progress = i / 23
                        // Interpolate between momentum values
                        let value
                        if (progress < 0.5) {
                          value = momentum[0] + (momentum[1] - momentum[0]) * (progress * 2)
                        } else {
                          value = momentum[1] + (momentum[2] - momentum[1]) * ((progress - 0.5) * 2)
                        }
                        
                        // Convert momentum to bar height (50% = middle)
                        const height = Math.max(5, Math.min(maxHeight, 50 + value / 2))
                        const isPositive = value >= 0
                        bars.push({ height, isPositive })
                      }
                      
                      return bars.map((bar, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-t ${
                            bar.isPositive ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ height: `${bar.height}%` }}
                        />
                      ))
                    })()}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>6M ago</span>
                    <span>3M ago</span>
                    <span>Now</span>
                  </div>
                </CardContent>
              </Card>

              {/* Valuation Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Valuation Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">P/E Ratio</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedStock.peRatio)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">P/S Ratio</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedStock.psRatio)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">P/B Ratio</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedStock.pbRatio)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">P/CF Ratio</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedStock.priceToCashFlowRatio)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">EV/EBITDA</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedStock.evToEbitda)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Health */}
              <Card>
                <CardHeader>
                  <CardTitle>Financial Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">ROE</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedStock.roe)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">ROA</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedStock.roa)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Debt/Equity</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedStock.debtToEquity)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Current Ratio</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedStock.currentRatio)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Quick Ratio</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedStock.quickRatio)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Growth Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Growth & Income</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Revenue Growth</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedStock.revenueGrowth)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Earnings Growth</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedStock.earningsGrowth)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Dividend Yield</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedStock.dividendYield)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Momentum & Technicals */}
              <Card>
                <CardHeader>
                  <CardTitle>Momentum & Technicals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">1M Momentum</p>
                      <p className={`text-lg font-semibold ${
                        selectedStock.momentum1M && selectedStock.momentum1M >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatNumber(selectedStock.momentum1M)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">3M Momentum</p>
                      <p className={`text-lg font-semibold ${
                        selectedStock.momentum3M && selectedStock.momentum3M >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatNumber(selectedStock.momentum3M)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">6M Momentum</p>
                      <p className={`text-lg font-semibold ${
                        selectedStock.momentum6M && selectedStock.momentum6M >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatNumber(selectedStock.momentum6M)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">12M Momentum</p>
                      <p className={`text-lg font-semibold ${
                        selectedStock.momentum12M && selectedStock.momentum12M >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatNumber(selectedStock.momentum12M)}%
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-500">Beta</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedStock.beta)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">50-Day MA</p>
                      <p className="text-lg font-semibold">{formatCurrency(selectedStock.fiftyDayMA)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">200-Day MA</p>
                      <p className="text-lg font-semibold">{formatCurrency(selectedStock.twoHundredDayMA)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent News */}
              {selectedStock.news && selectedStock.news.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent News</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedStock.news.slice(0, 5).map((article: any, index: number) => (
                        <div key={index} className="border-b pb-3 last:border-b-0">
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:underline"
                          >
                            {article.headline}
                          </a>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(article.datetime * 1000).toLocaleDateString()} · {article.source}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <p className="text-xs text-gray-500 text-center">
                Last updated: {new Date(selectedStock.lastUpdated).toLocaleString()}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
