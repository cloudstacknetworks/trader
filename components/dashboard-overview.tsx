
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Activity,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { PerformanceChart } from '@/components/charts/performance-chart'
import { PositionsTable } from '@/components/positions-table'
import { WatchlistPreview } from '@/components/watchlist-preview'

export function DashboardOverview() {
  const [accountData, setAccountData] = useState<any>(null)
  const [positions, setPositions] = useState<any[]>([])
  const [watchlist, setWatchlist] = useState<any[]>([])
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountRes, positionsRes, watchlistRes, tradesRes] = await Promise.all([
          fetch('/api/account'),
          fetch('/api/positions'),
          fetch('/api/watchlist?limit=5'),
          fetch('/api/trades?limit=5')
        ])

        const accountData = await accountRes.json()
        const positionsData = await positionsRes.json()
        const watchlistData = await watchlistRes.json()
        const tradesData = await tradesRes.json()

        setAccountData(accountData)
        setPositions(positionsData)
        setWatchlist(watchlistData?.slice?.(0, 5) || [])
        setTrades(tradesData?.trades?.slice?.(0, 5) || [])
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-24 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const totalReturn = accountData ? Number(accountData.totalPnl) : 0
  const currentValue = accountData ? Number(accountData.currentValue) : 1000
  const startingCapital = accountData ? Number(accountData.startingCapital) : 1000
  const returnPercentage = startingCapital > 0 ? ((currentValue - startingCapital) / startingCapital * 100) : 0
  const openPositions = positions?.length || 0
  const recentTrades = trades?.length || 0

  const isPaperTrading = accountData?.isPaperTrading !== false

  return (
    <div className="space-y-6">
      {/* Trading Mode Alert */}
      {isPaperTrading && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Paper Trading Mode Active
                </p>
                <p className="text-sm text-blue-700">
                  You're currently in paper trading mode. No real money is being used.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-blue-700 border-blue-300"
                onClick={() => window.location.href = '/dashboard/settings?tab=account'}
              >
                Switch to Live
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(2)}% from start
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            {totalReturn >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${totalReturn.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Realized + unrealized gains
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openPositions}</div>
            <p className="text-xs text-muted-foreground">
              Max {accountData?.maxPositions || 5} concurrent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Trades</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentTrades}</div>
            <p className="text-xs text-muted-foreground">
              Last 5 completed trades
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Performance</CardTitle>
          <CardDescription>
            Your portfolio value over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <PerformanceChart currentValue={currentValue} totalPnl={totalReturn} />
          </div>
        </CardContent>
      </Card>

      {/* Current Positions and Watchlist */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Open Positions</CardTitle>
            {openPositions > 0 && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {openPositions > 0 ? (
              <PositionsTable positions={positions?.slice?.(0, 5) || []} compact />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600">No open positions</p>
                <p className="text-xs text-gray-500 mt-1">
                  Positions will appear here when trades are executed
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Top Watchlist</CardTitle>
            <Badge variant="outline" className="text-blue-600">
              <Clock className="h-3 w-3 mr-1" />
              Live
            </Badge>
          </CardHeader>
          <CardContent>
            {watchlist?.length > 0 ? (
              <WatchlistPreview stocks={watchlist} />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600">No watchlist items</p>
                <p className="text-xs text-gray-500 mt-1">
                  Stocks will appear here after screening
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trading Activity</CardTitle>
          <CardDescription>
            Your most recent completed trades
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trades?.length > 0 ? (
            <div className="space-y-4">
              {trades.map((trade: any) => (
                <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full ${
                      (trade.realizedPnl || 0) >= 0 ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium">{trade.ticker}</p>
                      <p className="text-sm text-gray-600">
                        {trade.quantity} shares @ ${Number(trade.entryPrice).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      (trade.realizedPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${Number(trade.realizedPnl || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {trade.exitTime ? new Date(trade.exitTime).toLocaleDateString() : 'Open'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600">No recent trades</p>
              <p className="text-xs text-gray-500 mt-1">
                Trading activity will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
