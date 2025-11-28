
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Eye,
  RefreshCw
} from 'lucide-react'

export function WatchlistView() {
  const [watchlist, setWatchlist] = useState<any[]>([])
  const [screens, setScreens] = useState<any[]>([])
  const [selectedScreen, setSelectedScreen] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      const [watchlistRes, screensRes] = await Promise.all([
        fetch(`/api/watchlist${selectedScreen !== 'all' ? `?screenId=${selectedScreen}` : ''}`),
        fetch('/api/screens')
      ])

      const watchlistData = await watchlistRes.json()
      const screensData = await screensRes.json()

      setWatchlist(watchlistData || [])
      setScreens(screensData || [])
    } catch (error) {
      console.error('Error fetching watchlist data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedScreen])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const filteredWatchlist = watchlist.filter(stock =>
    stock.ticker.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-6"></div>
          <div className="grid gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Watchlist</h1>
        <p className="text-gray-600">
          Stocks identified by O'Shaughnessy screening methodology
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Stocks</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by ticker symbol..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-full sm:w-48">
              <Label htmlFor="screen">Filter by Screen</Label>
              <Select value={selectedScreen} onValueChange={setSelectedScreen}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All Screens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Screens</SelectItem>
                  {screens.map((screen) => (
                    <SelectItem key={screen.id} value={screen.id}>
                      {screen.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stocks</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredWatchlist.length}</div>
            <p className="text-xs text-muted-foreground">
              In current filter
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredWatchlist.length > 0 
                ? (filteredWatchlist.reduce((sum, stock) => sum + Number(stock.score || 0), 0) / filteredWatchlist.length).toFixed(1)
                : '0.0'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Quality rating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Earnings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredWatchlist.filter(stock => stock.earningsDate).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Upcoming earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Watchlist Table */}
      <Card>
        <CardHeader>
          <CardTitle>Screening Results</CardTitle>
          <CardDescription>
            Stocks ranked by O'Shaughnessy scoring methodology
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredWatchlist.length > 0 ? (
            <div className="space-y-2">
              {filteredWatchlist.map((stock) => {
                const score = Number(stock.score || 0)
                const currentPrice = Number(stock.currentPrice || 0)
                const momentum = Number(stock.momentum || 0)
                const sentiment = Number(stock.sentimentScore || 0)
                const peRatio = Number(stock.peRatio || 0)
                const psRatio = Number(stock.psRatio || 0)
                
                return (
                  <div 
                    key={stock.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold text-gray-900">
                              {stock.ticker}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`${
                                score >= 8 ? 'border-green-500 text-green-700' :
                                score >= 6 ? 'border-blue-500 text-blue-700' :
                                'border-gray-500 text-gray-700'
                              }`}
                            >
                              Score: {score.toFixed(1)}
                            </Badge>
                            {stock.screen && (
                              <Badge variant="secondary" className="text-xs">
                                {stock.screen.name}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                            {currentPrice > 0 && (
                              <div className="flex items-center space-x-1">
                                <DollarSign className="h-3 w-3" />
                                <span>${currentPrice.toFixed(2)}</span>
                              </div>
                            )}
                            
                            {peRatio > 0 && (
                              <span>P/E: {peRatio.toFixed(1)}</span>
                            )}
                            
                            {psRatio > 0 && (
                              <span>P/S: {psRatio.toFixed(1)}</span>
                            )}
                            
                            {stock.earningsDate && (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  Earnings: {new Date(stock.earningsDate).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {momentum !== 0 && (
                        <div className="flex items-center space-x-1">
                          {momentum > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span className={`text-sm font-medium ${
                            momentum > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {momentum > 0 ? '+' : ''}{momentum.toFixed(1)}%
                          </span>
                        </div>
                      )}
                      
                      {sentiment !== 0 && (
                        <div className={`text-sm ${
                          sentiment > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          Sentiment: {sentiment > 0 ? '+' : ''}{sentiment.toFixed(2)}
                        </div>
                      )}
                      
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          Added: {new Date(stock.dateAdded).toLocaleDateString()}
                        </div>
                        {stock.newsCount > 0 && (
                          <div className="text-xs text-blue-600">
                            {stock.newsCount} news items
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Eye className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg text-gray-600 mb-2">No stocks in watchlist</p>
              <p className="text-sm text-gray-500">
                {searchTerm 
                  ? 'No stocks match your search criteria' 
                  : 'Run the weekly screening to populate the watchlist'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
