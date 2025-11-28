
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  History,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Search,
  RefreshCw,
  Filter
} from 'lucide-react'

export function TradesView() {
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  const fetchTrades = async () => {
    try {
      const response = await fetch('/api/trades?limit=100')
      const data = await response.json()
      setTrades(data?.trades || [])
    } catch (error) {
      console.error('Error fetching trades:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchTrades()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchTrades()
  }

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = trade.ticker.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'winning' && Number(trade.realizedPnl || 0) > 0) ||
      (filterStatus === 'losing' && Number(trade.realizedPnl || 0) < 0) ||
      (filterStatus === 'open' && !trade.exitTime)
    
    return matchesSearch && matchesFilter
  })

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

  const completedTrades = trades.filter(t => t.exitTime)
  const totalPnl = completedTrades.reduce((sum, t) => sum + Number(t.realizedPnl || 0), 0)
  const winningTrades = completedTrades.filter(t => Number(t.realizedPnl || 0) > 0)
  const winRate = completedTrades.length > 0 ? (winningTrades.length / completedTrades.length * 100) : 0
  const avgHoldTime = completedTrades.length > 0 
    ? completedTrades.reduce((sum, t) => sum + (t.holdTimeMinutes || 0), 0) / completedTrades.length
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trade History</h1>
          <p className="text-gray-600">
            Complete record of all executed trades and their performance
          </p>
        </div>
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

      {/* Performance Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trades.length}</div>
            <p className="text-xs text-muted-foreground">
              {completedTrades.length} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            {totalPnl >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              totalPnl >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Realized gains/losses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {winningTrades.length}/{completedTrades.length} winning
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hold Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgHoldTime < 60 
                ? `${Math.round(avgHoldTime)}m` 
                : `${Math.round(avgHoldTime / 60)}h`
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Time in position
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Trades</Label>
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
              <Label htmlFor="filter">Filter by Result</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All Trades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trades</SelectItem>
                  <SelectItem value="winning">Winning Only</SelectItem>
                  <SelectItem value="losing">Losing Only</SelectItem>
                  <SelectItem value="open">Open Positions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trades List */}
      <Card>
        <CardHeader>
          <CardTitle>Trading History</CardTitle>
          <CardDescription>
            Detailed record of all trades with entry/exit information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTrades.length > 0 ? (
            <div className="space-y-3">
              {filteredTrades.map((trade) => {
                const realizedPnl = Number(trade.realizedPnl || 0)
                const entryPrice = Number(trade.entryPrice)
                const exitPrice = Number(trade.exitPrice || 0)
                const isWinning = realizedPnl >= 0
                const isOpen = !trade.exitTime
                const pnlPercentage = entryPrice > 0 && exitPrice > 0 
                  ? ((exitPrice - entryPrice) / entryPrice * 100)
                  : 0
                
                return (
                  <div 
                    key={trade.id} 
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      isOpen ? 'border-blue-200 bg-blue-50' :
                      isWinning ? 'border-green-200 bg-green-50' : 
                      'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold text-gray-900">
                              {trade.ticker}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`${
                                isOpen ? 'border-blue-500 text-blue-700' :
                                isWinning ? 'border-green-500 text-green-700' : 
                                'border-red-500 text-red-700'
                              }`}
                            >
                              {isOpen ? 'Open' : isWinning ? 'Win' : 'Loss'}
                            </Badge>
                            {trade.strategy && (
                              <Badge variant="secondary" className="text-xs">
                                {trade.strategy}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                            <div>
                              <p className="text-gray-500">Quantity</p>
                              <p className="font-medium">{trade.quantity} shares</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Entry</p>
                              <p className="font-medium">${entryPrice.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Exit</p>
                              <p className="font-medium">
                                {exitPrice > 0 ? `$${exitPrice.toFixed(2)}` : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Duration</p>
                              <p className="font-medium">
                                {trade.holdTimeMinutes
                                  ? trade.holdTimeMinutes < 60 
                                    ? `${trade.holdTimeMinutes}m`
                                    : `${Math.floor(trade.holdTimeMinutes / 60)}h ${trade.holdTimeMinutes % 60}m`
                                  : isOpen ? 'Open' : '-'
                                }
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                            <span>Entry: {new Date(trade.entryTime).toLocaleString()}</span>
                            {trade.exitTime && (
                              <span>Exit: {new Date(trade.exitTime).toLocaleString()}</span>
                            )}
                            {trade.exitReason && (
                              <Badge variant="outline" className="text-xs">
                                {trade.exitReason.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {!isOpen && (
                        <>
                          <div className={`text-xl font-bold ${
                            isWinning ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {realizedPnl >= 0 ? '+' : ''}${realizedPnl.toFixed(2)}
                          </div>
                          <div className={`text-sm ${
                            isWinning ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%
                          </div>
                        </>
                      )}
                      {isOpen && (
                        <div className="text-blue-600 font-medium">
                          Position Open
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg text-gray-600 mb-2">No trades found</p>
              <p className="text-sm text-gray-500">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No trades match your current filters' 
                  : 'Trades will appear here after execution'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
