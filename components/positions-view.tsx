
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertTriangle,
  RefreshCw,
  X
} from 'lucide-react'

export function PositionsView() {
  const [positions, setPositions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [closingPosition, setClosingPosition] = useState<string | null>(null)

  const fetchPositions = async () => {
    try {
      const response = await fetch('/api/positions')
      const data = await response.json()
      setPositions(data || [])
    } catch (error) {
      console.error('Error fetching positions:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPositions()
    const interval = setInterval(fetchPositions, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchPositions()
  }

  const handleClosePosition = async (positionId: string) => {
    if (!confirm('Are you sure you want to close this position?')) return
    
    setClosingPosition(positionId)
    try {
      const response = await fetch(`/api/positions/${positionId}/close`, {
        method: 'POST',
      })
      
      if (response.ok) {
        // Refresh positions after closing
        await fetchPositions()
      } else {
        alert('Failed to close position. Please try again.')
      }
    } catch (error) {
      console.error('Error closing position:', error)
      alert('Error closing position. Please try again.')
    } finally {
      setClosingPosition(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-6"></div>
          <div className="grid gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const totalUnrealizedPnl = positions.reduce((sum, pos) => sum + Number(pos.unrealizedPnl || 0), 0)
  const totalValue = positions.reduce((sum, pos) => sum + (Number(pos.currentPrice || pos.entryPrice) * pos.quantity), 0)
  const winningPositions = positions.filter(pos => Number(pos.unrealizedPnl || 0) > 0).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Open Positions</h1>
          <p className="text-gray-600">
            Monitor your active trades and unrealized P&L
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Prices</span>
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions.length}</div>
            <p className="text-xs text-muted-foreground">
              Active trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Market value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
            {totalUnrealizedPnl >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              totalUnrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total unrealized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {positions.length > 0 ? Math.round((winningPositions / positions.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Currently winning
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Positions List */}
      {positions.length > 0 ? (
        <div className="space-y-4">
          {positions.map((position) => {
            const unrealizedPnl = Number(position.unrealizedPnl || 0)
            const currentPrice = Number(position.currentPrice || position.entryPrice)
            const entryPrice = Number(position.entryPrice)
            const pnlPercentage = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice * 100) : 0
            const totalValue = currentPrice * position.quantity
            const trailingStopPrice = Number(position.trailingStopPrice || 0)
            const entryTime = new Date(position.entryTime)
            const timeHeld = Math.floor((Date.now() - entryTime.getTime()) / (1000 * 60)) // minutes
            
            const isWinning = unrealizedPnl >= 0
            const isNearStop = trailingStopPrice > 0 && currentPrice < (trailingStopPrice * 1.02)
            
            return (
              <Card key={position.id} className={`${
                isWinning ? 'border-green-200' : 'border-red-200'
              }`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl font-bold text-gray-900">
                              {position.ticker}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`${
                                isWinning ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'
                              }`}
                            >
                              {isWinning ? 'Winning' : 'Losing'}
                            </Badge>
                            
                            {isNearStop && (
                              <Badge variant="outline" className="border-orange-500 text-orange-700">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Near Stop
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                            <div>
                              <p className="text-gray-500">Quantity</p>
                              <p className="font-medium">{position.quantity} shares</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Entry Price</p>
                              <p className="font-medium">${entryPrice.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Current Price</p>
                              <p className="font-medium">${currentPrice.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Total Value</p>
                              <p className="font-medium">${totalValue.toFixed(2)}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                            <div>
                              <p className="text-gray-500">Time Held</p>
                              <p className="font-medium flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {timeHeld < 60 ? `${timeHeld}m` : `${Math.floor(timeHeld / 60)}h ${timeHeld % 60}m`}
                              </p>
                            </div>
                            {trailingStopPrice > 0 && (
                              <div>
                                <p className="text-gray-500">Trailing Stop</p>
                                <p className="font-medium">${trailingStopPrice.toFixed(2)}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-gray-500">Entry Time</p>
                              <p className="font-medium">{entryTime.toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-2">
                      <div>
                        <div className={`text-2xl font-bold ${
                          isWinning ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
                        </div>
                        <div className={`text-lg ${
                          isWinning ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => handleClosePosition(position.id)}
                        disabled={closingPosition === position.id}
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1 text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <X className="h-3 w-3" />
                        <span>
                          {closingPosition === position.id ? 'Closing...' : 'Close'}
                        </span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-8">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg text-gray-600 mb-2">No Open Positions</p>
              <p className="text-sm text-gray-500">
                Positions will appear here when trades are executed
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Important Note */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Automated Trading:</strong> Positions are monitored every 15 minutes during market hours. 
          Trailing stop-loss orders are managed automatically via Alpaca API.
        </AlertDescription>
      </Alert>
    </div>
  )
}
