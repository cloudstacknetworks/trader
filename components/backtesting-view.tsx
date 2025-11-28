
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TestTube,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Clock,
  Play,
  Loader
} from 'lucide-react'

export function BacktestingView() {
  const [screens, setScreens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<any>(null)

  const [backtestParams, setBacktestParams] = useState({
    screenId: '',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    initialCapital: 10000,
    maxPositions: 5,
    trailingStopPct: 0.75,
  })

  useEffect(() => {
    const fetchScreens = async () => {
      try {
        const response = await fetch('/api/screens')
        const data = await response.json()
        setScreens(data || [])
        
        if (data && data.length > 0) {
          setBacktestParams(prev => ({ ...prev, screenId: data[0].id }))
        }
      } catch (error) {
        console.error('Error fetching screens:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchScreens()
  }, [])

  const runBacktest = async () => {
    setRunning(true)
    setResults(null)
    
    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backtestParams),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to run backtest')
      }

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error running backtest:', error)
      alert(error instanceof Error ? error.message : 'Failed to run backtest. Please try again.')
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Backtesting Engine</h1>
        <p className="text-gray-600">
          Test your complete News Trader strategy on historical data
        </p>
        <div className="mt-2 space-y-2">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>What this tests:</strong> The backtest simulates the full trading workflow for each day in your selected period:
              (1) Screens stocks using O&apos;Shaughnessy criteria, (2) Filters for stocks with positive momentum (&gt;5% 3M) 
              simulating news catalysts, (3) Enters positions with trailing stops, (4) Exits based on trailing stop, 
              negative momentum, or time cutoff (5 days).
            </p>
          </div>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Historical news sentiment data is not available, so the backtest uses 3-month momentum 
              as a proxy for positive news catalysts. Stocks with momentum &gt;5% are treated as having favorable news, 
              while momentum &lt;-10% triggers exits (simulating negative news).
            </p>
          </div>
        </div>
      </div>

      {/* Backtest Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TestTube className="h-5 w-5" />
            <span>Backtest Configuration</span>
          </CardTitle>
          <CardDescription>
            Set up your backtest parameters and screening strategy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="screen">Screening Strategy</Label>
              <Select 
                value={backtestParams.screenId} 
                onValueChange={(value) => setBacktestParams(prev => ({ ...prev, screenId: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a screen" />
                </SelectTrigger>
                <SelectContent>
                  {screens.map((screen) => (
                    <SelectItem key={screen.id} value={screen.id}>
                      {screen.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="initialCapital">Initial Capital ($)</Label>
              <Input
                id="initialCapital"
                type="number"
                min="1000"
                max="1000000"
                value={backtestParams.initialCapital}
                onChange={(e) => setBacktestParams(prev => ({ 
                  ...prev, 
                  initialCapital: Number(e.target.value) 
                }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={backtestParams.startDate}
                onChange={(e) => setBacktestParams(prev => ({ 
                  ...prev, 
                  startDate: e.target.value 
                }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={backtestParams.endDate}
                onChange={(e) => setBacktestParams(prev => ({ 
                  ...prev, 
                  endDate: e.target.value 
                }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="maxPositions">Max Positions</Label>
              <Input
                id="maxPositions"
                type="number"
                min="1"
                max="20"
                value={backtestParams.maxPositions}
                onChange={(e) => setBacktestParams(prev => ({ 
                  ...prev, 
                  maxPositions: Number(e.target.value) 
                }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="trailingStop">Trailing Stop (%)</Label>
              <Input
                id="trailingStop"
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={backtestParams.trailingStopPct}
                onChange={(e) => setBacktestParams(prev => ({ 
                  ...prev, 
                  trailingStopPct: Number(e.target.value) 
                }))}
                className="mt-1"
              />
            </div>
          </div>
          
          <Button 
            onClick={runBacktest} 
            disabled={running || !backtestParams.screenId}
            className="w-full flex items-center justify-center space-x-2"
          >
            {running ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Running Backtest...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Run Backtest</span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Backtest Results */}
      {results && (
        <div className="space-y-6">
          {/* Performance Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Return</CardTitle>
                {results.totalReturn >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  results.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {results.totalReturn >= 0 ? '+' : ''}${results.totalReturn.toFixed(2)}
                </div>
                <p className={`text-xs ${
                  results.totalReturnPct >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {results.totalReturnPct >= 0 ? '+' : ''}{results.totalReturnPct.toFixed(2)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{results.winRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {results.winningTrades}/{results.totalTrades} trades
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{results.sharpeRatio.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  Risk-adjusted return
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {results.maxDrawdown.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Worst decline
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Trading Metrics</CardTitle>
                <CardDescription>
                  Detailed performance statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total Trades</p>
                    <p className="font-medium">{results.totalTrades}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Avg Hold Time</p>
                    <p className="font-medium">{results.avgHoldTime.toFixed(1)} days</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Avg Gain</p>
                    <p className="font-medium text-green-600">+{results.avgGain.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Avg Loss</p>
                    <p className="font-medium text-red-600">{results.avgLoss.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Best Trade</p>
                    <p className="font-medium text-green-600">+{results.bestTrade.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Worst Trade</p>
                    <p className="font-medium text-red-600">{results.worstTrade.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Profit Factor</p>
                    <p className="font-medium">{results.profitFactor.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Winning Trades</p>
                    <p className="font-medium">{results.winningTrades}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sample Trades</CardTitle>
                <CardDescription>
                  Recent trades from the backtest period (last 20 shown)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.trades && results.trades.length > 0 ? (
                    results.trades.map((trade: any, index: number) => (
                      <div 
                        key={index}
                        className="p-3 bg-gray-50 rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{trade.ticker}</span>
                            <Badge 
                              variant="outline" 
                              className={`${
                                trade.result === 'win' ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'
                              }`}
                            >
                              {trade.result === 'win' ? 'Win' : 'Loss'}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className={`font-medium ${
                              trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ${trade.pnl.toFixed(2)} ({trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct.toFixed(2)}%)
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>Entry: ${trade.entryPrice?.toFixed(2)} on {trade.entryDate}</span>
                          <span>Exit: ${trade.exitPrice?.toFixed(2)} on {trade.exitDate}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Held: {trade.daysHeld} days</span>
                          <span>Reason: {trade.exitReason}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No trades executed in this backtest</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!results && !running && (
        <Card>
          <CardContent className="pt-8">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TestTube className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg text-gray-600 mb-2">Ready to Run Backtest</p>
              <p className="text-sm text-gray-500">
                Configure your parameters above and click "Run Backtest" to see results
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
