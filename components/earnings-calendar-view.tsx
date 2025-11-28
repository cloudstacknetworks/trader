
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar as CalendarIcon, TrendingUp, AlertCircle, Loader2, RefreshCw, Filter, Plus, ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react'
import { format, addDays, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'

interface EarningsItem {
  id: string
  symbol: string
  earningsDate: string
  fiscalQuarter: string
  fiscalYear: number
  estimatedEPS: number | null
  actualEPS: number | null
  beat: boolean | null
  surprise: number | null
}

interface EarningsByDate {
  date: string
  earnings: EarningsItem[]
}

interface StockData {
  symbol: string
  companyName: string | null
  currentPrice: number | null
  marketCap: number | null
  peRatio: number | null
  psRatio: number | null
  pbRatio: number | null
  pcfRatio: number | null
  roe: number | null
  debtToEquity: number | null
  currentRatio: number | null
  revenueGrowth: number | null
  earningsGrowth: number | null
  dividendYield: number | null
  volume: number | null
  momentum: number | null
}

interface FilterCriteria {
  // Valuation
  minPE: number
  maxPE: number
  minPS: number
  maxPS: number
  minPB: number
  maxPB: number
  minPCF: number
  maxPCF: number
  // Financial Health
  minROE: number
  maxROE: number
  minDebtToEquity: number
  maxDebtToEquity: number
  minCurrentRatio: number
  maxCurrentRatio: number
  // Growth
  minRevenueGrowth: number
  maxRevenueGrowth: number
  minEarningsGrowth: number
  maxEarningsGrowth: number
  // Income
  minDividendYield: number
  maxDividendYield: number
  // Market
  minMarketCap: number
  maxMarketCap: number
  minVolume: number
  maxVolume: number
  minMomentum: number
  maxMomentum: number
}

interface Screen {
  id: string
  name: string
  description: string | null
  screenType: 'OSHAUGHNESSY' | 'EARNINGS'
  minPE?: number
  maxPE?: number
  minPS?: number
  maxPS?: number
  minPB?: number
  maxPB?: number
  minPCF?: number
  maxPCF?: number
  minROE?: number
  maxROE?: number
  minDebtToEquity?: number
  maxDebtToEquity?: number
  minCurrentRatio?: number
  maxCurrentRatio?: number
  minRevenueGrowth?: number
  maxRevenueGrowth?: number
  minEarningsGrowth?: number
  maxEarningsGrowth?: number
  minDividendYield?: number
  maxDividendYield?: number
  minMarketCap?: number
  maxMarketCap?: number
  minVolume?: number
  maxVolume?: number
  minMomentum?: number
  maxMomentum?: number
}

export default function EarningsCalendarView() {
  const router = useRouter()
  const [earningsData, setEarningsData] = useState<EarningsByDate[]>([])
  const [stockDataMap, setStockDataMap] = useState<{ [symbol: string]: StockData }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fetchingData, setFetchingData] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [filtersActive, setFiltersActive] = useState(false)
  const [isCreatingScreen, setIsCreatingScreen] = useState(false)
  const [screenName, setScreenName] = useState('')
  const [minEarningsSurprise, setMinEarningsSurprise] = useState(5.0)
  const [allocatedCapital, setAllocatedCapital] = useState(0)
  const [maxPositions, setMaxPositions] = useState(10)
  
  // New: Screens and selection
  const [availableScreens, setAvailableScreens] = useState<Screen[]>([])
  const [selectedScreenId, setSelectedScreenId] = useState<string>('')
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(new Set())
  const [isSavingAsScreen, setIsSavingAsScreen] = useState(false)
  const [newScreenName, setNewScreenName] = useState('')
  
  // Expand/collapse state for date groups
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  
  const toggleDateExpanded = (date: string) => {
    const newExpanded = new Set(expandedDates)
    if (newExpanded.has(date)) {
      newExpanded.delete(date)
    } else {
      newExpanded.add(date)
    }
    setExpandedDates(newExpanded)
  }
  
  const handleSelectAllForDate = (dayData: EarningsByDate, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent toggling expand/collapse
    const newSelection = new Set(selectedSymbols)
    dayData.earnings.forEach(earning => {
      newSelection.add(earning.symbol)
    })
    setSelectedSymbols(newSelection)
  }
  
  const [filters, setFilters] = useState<FilterCriteria>({
    minPE: 0, maxPE: 999,
    minPS: 0, maxPS: 999,
    minPB: 0, maxPB: 999,
    minPCF: 0, maxPCF: 999,
    minROE: -999, maxROE: 999,
    minDebtToEquity: 0, maxDebtToEquity: 999,
    minCurrentRatio: 0, maxCurrentRatio: 999,
    minRevenueGrowth: -999, maxRevenueGrowth: 999,
    minEarningsGrowth: -999, maxEarningsGrowth: 999,
    minDividendYield: 0, maxDividendYield: 999,
    minMarketCap: 0, maxMarketCap: 999999999999,
    minVolume: 0, maxVolume: 999999999999,
    minMomentum: -999, maxMomentum: 999
  })

  const fetchEarningsCalendar = async () => {
    try {
      setError('')
      const today = new Date()
      const futureDate = addDays(today, 30)
      
      const from = format(today, 'yyyy-MM-dd')
      const to = format(futureDate, 'yyyy-MM-dd')

      const response = await fetch(`/api/earnings-calendar?from=${from}&to=${to}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch earnings calendar')
      }

      const data = await response.json()
      
      // Group earnings by date
      const grouped: { [key: string]: EarningsItem[] } = {}
      
      data.earnings.forEach((earning: EarningsItem) => {
        // Parse the ISO date and extract just the date part (YYYY-MM-DD)
        // This ensures we're using the actual date from the database, not affected by timezones
        const dateObj = new Date(earning.earningsDate)
        const date = earning.earningsDate.split('T')[0] // Extract YYYY-MM-DD directly from ISO string
        if (!grouped[date]) {
          grouped[date] = []
        }
        grouped[date].push(earning)
      })

      // Convert to array and sort by date
      const groupedArray = Object.keys(grouped)
        .sort()
        .map(date => ({
          date,
          earnings: grouped[date].sort((a, b) => a.symbol.localeCompare(b.symbol))
        }))

      setEarningsData(groupedArray)
      
      // Fetch stock data for all symbols
      await fetchStockData(data.earnings.map((e: EarningsItem) => e.symbol))
    } catch (err: any) {
      console.error('Error fetching earnings calendar:', err)
      setError(err.message || 'Failed to load earnings calendar')
    } finally {
      setLoading(false)
    }
  }

  const fetchStockData = async (symbols: string[]) => {
    try {
      // Fetch stock data in batches to avoid overwhelming the API
      const batchSize = 50
      const stockData: { [symbol: string]: StockData } = {}
      
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize)
        const promises = batch.map(async (symbol) => {
          try {
            const res = await fetch(`/api/market/${symbol}`)
            if (res.ok) {
              const data = await res.json()
              return { symbol, data: data.stockData }
            }
          } catch (err) {
            console.error(`Failed to fetch data for ${symbol}`, err)
          }
          return null
        })
        
        const results = await Promise.all(promises)
        results.forEach(result => {
          if (result && result.data) {
            stockData[result.symbol] = result.data
          }
        })
      }
      
      setStockDataMap(stockData)
    } catch (err) {
      console.error('Error fetching stock data:', err)
    }
  }

  const passesFilters = (symbol: string): boolean => {
    if (!filtersActive) return true
    
    const stock = stockDataMap[symbol]
    if (!stock) return true // If no data, don't filter out
    
    // Check all filter criteria
    if (stock.peRatio !== null && (stock.peRatio < filters.minPE || stock.peRatio > filters.maxPE)) return false
    if (stock.psRatio !== null && (stock.psRatio < filters.minPS || stock.psRatio > filters.maxPS)) return false
    if (stock.pbRatio !== null && (stock.pbRatio < filters.minPB || stock.pbRatio > filters.maxPB)) return false
    if (stock.pcfRatio !== null && (stock.pcfRatio < filters.minPCF || stock.pcfRatio > filters.maxPCF)) return false
    
    if (stock.roe !== null && (stock.roe < filters.minROE || stock.roe > filters.maxROE)) return false
    if (stock.debtToEquity !== null && (stock.debtToEquity < filters.minDebtToEquity || stock.debtToEquity > filters.maxDebtToEquity)) return false
    if (stock.currentRatio !== null && (stock.currentRatio < filters.minCurrentRatio || stock.currentRatio > filters.maxCurrentRatio)) return false
    
    if (stock.revenueGrowth !== null && (stock.revenueGrowth < filters.minRevenueGrowth || stock.revenueGrowth > filters.maxRevenueGrowth)) return false
    if (stock.earningsGrowth !== null && (stock.earningsGrowth < filters.minEarningsGrowth || stock.earningsGrowth > filters.maxEarningsGrowth)) return false
    
    if (stock.dividendYield !== null && (stock.dividendYield < filters.minDividendYield || stock.dividendYield > filters.maxDividendYield)) return false
    
    if (stock.marketCap !== null && (stock.marketCap < filters.minMarketCap || stock.marketCap > filters.maxMarketCap)) return false
    if (stock.volume !== null && (stock.volume < filters.minVolume || stock.volume > filters.maxVolume)) return false
    if (stock.momentum !== null && (stock.momentum < filters.minMomentum || stock.momentum > filters.maxMomentum)) return false
    
    return true
  }

  const getFilteredEarningsData = (): EarningsByDate[] => {
    if (!filtersActive) return earningsData
    
    return earningsData.map(dayData => ({
      ...dayData,
      earnings: dayData.earnings.filter(e => passesFilters(e.symbol))
    })).filter(dayData => dayData.earnings.length > 0)
  }

  const handleApplyFilters = () => {
    setFiltersActive(true)
    setFiltersExpanded(false)
  }

  const handleClearFilters = () => {
    setFilters({
      minPE: 0, maxPE: 999,
      minPS: 0, maxPS: 999,
      minPB: 0, maxPB: 999,
      minPCF: 0, maxPCF: 999,
      minROE: -999, maxROE: 999,
      minDebtToEquity: 0, maxDebtToEquity: 999,
      minCurrentRatio: 0, maxCurrentRatio: 999,
      minRevenueGrowth: -999, maxRevenueGrowth: 999,
      minEarningsGrowth: -999, maxEarningsGrowth: 999,
      minDividendYield: 0, maxDividendYield: 999,
      minMarketCap: 0, maxMarketCap: 999999999999,
      minVolume: 0, maxVolume: 999999999999,
      minMomentum: -999, maxMomentum: 999
    })
    setFiltersActive(false)
  }

  const handleCreateScreen = async () => {
    if (!screenName.trim()) {
      alert('Please enter a screen name')
      return
    }
    
    if (selectedSymbols.size === 0) {
      alert('Please select at least one stock to monitor')
      return
    }
    
    setIsCreatingScreen(true)
    try {
      const response = await fetch('/api/screens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: screenName,
          description: `Earnings strategy monitoring ${selectedSymbols.size} selected stocks - trades when they beat earnings by ${minEarningsSurprise}%+`,
          screenType: 'EARNINGS',
          isActive: true,
          ...filters,
          minEarningsSurprise,
          allocatedCapital: allocatedCapital > 0 ? allocatedCapital : null,
          currentCapital: allocatedCapital > 0 ? allocatedCapital : null,
          maxPositions,
          monitoredSymbols: JSON.stringify(Array.from(selectedSymbols))
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error', details: 'No details available' }))
        console.error('Screen creation failed:', errorData)
        throw new Error(errorData.details || errorData.error || 'Failed to create screen')
      }
      
      alert(`Screen "${screenName}" created successfully! Monitoring ${selectedSymbols.size} stocks for earnings beats.${allocatedCapital > 0 ? ` Allocated capital: $${allocatedCapital.toLocaleString()}` : ''}`)
      setScreenName('')
      setAllocatedCapital(0)
      setMaxPositions(10)
      setSelectedSymbols(new Set())
      router.push('/dashboard/screens')
    } catch (err: any) {
      console.error('Error creating screen:', err)
      alert(err.message || 'Failed to create screen')
    } finally {
      setIsCreatingScreen(false)
    }
  }

  const formatMarketCap = (value: number | null): string => {
    if (value === null) return 'N/A'
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
    return `$${value.toLocaleString()}`
  }

  const fetchScreens = async () => {
    try {
      const response = await fetch('/api/screens')
      if (response.ok) {
        const data = await response.json()
        setAvailableScreens(data.screens || [])
      }
    } catch (err) {
      console.error('Error fetching screens:', err)
    }
  }

  const handleApplyScreen = () => {
    const screen = availableScreens.find(s => s.id === selectedScreenId)
    if (!screen) return

    // Apply screen's filter criteria
    setFilters({
      minPE: Number(screen.minPE || 0),
      maxPE: Number(screen.maxPE || 999),
      minPS: Number(screen.minPS || 0),
      maxPS: Number(screen.maxPS || 999),
      minPB: Number(screen.minPB || 0),
      maxPB: Number(screen.maxPB || 999),
      minPCF: Number(screen.minPCF || 0),
      maxPCF: Number(screen.maxPCF || 999),
      minROE: Number(screen.minROE || -999),
      maxROE: Number(screen.maxROE || 999),
      minDebtToEquity: Number(screen.minDebtToEquity || 0),
      maxDebtToEquity: Number(screen.maxDebtToEquity || 999),
      minCurrentRatio: Number(screen.minCurrentRatio || 0),
      maxCurrentRatio: Number(screen.maxCurrentRatio || 999),
      minRevenueGrowth: Number(screen.minRevenueGrowth || -999),
      maxRevenueGrowth: Number(screen.maxRevenueGrowth || 999),
      minEarningsGrowth: Number(screen.minEarningsGrowth || -999),
      maxEarningsGrowth: Number(screen.maxEarningsGrowth || 999),
      minDividendYield: Number(screen.minDividendYield || 0),
      maxDividendYield: Number(screen.maxDividendYield || 999),
      minMarketCap: Number(screen.minMarketCap || 0),
      maxMarketCap: Number(screen.maxMarketCap || 999999999999),
      minVolume: Number(screen.minVolume || 0),
      maxVolume: Number(screen.maxVolume || 999999999999),
      minMomentum: Number(screen.minMomentum || -999),
      maxMomentum: Number(screen.maxMomentum || 999)
    })
    setFiltersActive(true)
    setFiltersExpanded(false)
  }

  const handleToggleSymbol = (symbol: string) => {
    const newSelection = new Set(selectedSymbols)
    if (newSelection.has(symbol)) {
      newSelection.delete(symbol)
    } else {
      newSelection.add(symbol)
    }
    setSelectedSymbols(newSelection)
  }

  const handleSelectAll = () => {
    const allSymbols = new Set<string>()
    filteredData.forEach(dayData => {
      dayData.earnings.forEach(e => allSymbols.add(e.symbol))
    })
    setSelectedSymbols(allSymbols)
  }

  const handleClearSelection = () => {
    setSelectedSymbols(new Set())
  }

  const handleSaveFiltersAsScreen = async () => {
    if (!newScreenName.trim()) {
      alert('Please enter a screen name')
      return
    }

    setIsSavingAsScreen(true)
    try {
      const response = await fetch('/api/screens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newScreenName,
          description: `Custom screen created from earnings calendar filters`,
          screenType: 'OSHAUGHNESSY',
          isActive: true,
          ...filters
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create screen')
      }

      alert(`Screen "${newScreenName}" created successfully!`)
      setNewScreenName('')
      await fetchScreens() // Refresh screens list
    } catch (err: any) {
      console.error('Error creating screen:', err)
      alert(err.message || 'Failed to create screen')
    } finally {
      setIsSavingAsScreen(false)
    }
  }

  const handleFetchFromAPI = async () => {
    if (fetchingData) return
    
    setFetchingData(true)
    setError('')
    
    try {
      const response = await fetch('/home/ubuntu/oshaughnessy_trader/nextjs_space/scripts/fetch-earnings-calendar.ts')
      // In production, this would call a backend endpoint that runs the script
      // For now, we'll show a message
      alert('Earnings calendar fetch initiated. This may take a few minutes. The page will refresh automatically.')
      setTimeout(() => {
        fetchEarningsCalendar()
      }, 3000)
    } catch (err: any) {
      setError('Failed to fetch earnings data from API')
    } finally {
      setFetchingData(false)
    }
  }

  useEffect(() => {
    fetchEarningsCalendar()
    fetchScreens()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const filteredData = getFilteredEarningsData()
  const totalFiltered = filteredData.reduce((sum, day) => sum + day.earnings.length, 0)
  const totalOriginal = earningsData.reduce((sum, day) => sum + day.earnings.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
            Earnings Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            Track earnings reports for the next 30 days {filtersActive && `(${totalFiltered} of ${totalOriginal} match filters)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setFiltersExpanded(!filtersExpanded)} 
            variant="outline" 
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {filtersExpanded ? 'Hide Filters' : 'Show Filters'}
            {filtersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button onClick={fetchEarningsCalendar} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters Panel */}
      {filtersExpanded && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter by Quality Criteria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Valuation - Compact 4 columns */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground">Valuation</h4>
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="minPE" className="text-xs">Min P/E</Label>
                  <Input id="minPE" type="number" step="0.1" value={filters.minPE} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, minPE: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxPE" className="text-xs">Max P/E</Label>
                  <Input id="maxPE" type="number" step="0.1" value={filters.maxPE} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, maxPE: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="minPS" className="text-xs">Min P/S</Label>
                  <Input id="minPS" type="number" step="0.1" value={filters.minPS} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, minPS: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxPS" className="text-xs">Max P/S</Label>
                  <Input id="maxPS" type="number" step="0.1" value={filters.maxPS} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, maxPS: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="minPB" className="text-xs">Min P/B</Label>
                  <Input id="minPB" type="number" step="0.1" value={filters.minPB} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, minPB: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxPB" className="text-xs">Max P/B</Label>
                  <Input id="maxPB" type="number" step="0.1" value={filters.maxPB} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, maxPB: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="minPCF" className="text-xs">Min P/CF</Label>
                  <Input id="minPCF" type="number" step="0.1" value={filters.minPCF} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, minPCF: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxPCF" className="text-xs">Max P/CF</Label>
                  <Input id="maxPCF" type="number" step="0.1" value={filters.maxPCF} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, maxPCF: Number(e.target.value) })} />
                </div>
              </div>
            </div>

            {/* Financial Health - Compact 4 columns */}
            <div className="space-y-1.5 border-t pt-2">
              <h4 className="text-xs font-semibold text-muted-foreground">Financial Health</h4>
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="minROE" className="text-xs">Min ROE %</Label>
                  <Input id="minROE" type="number" step="0.1" value={filters.minROE} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, minROE: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxROE" className="text-xs">Max ROE %</Label>
                  <Input id="maxROE" type="number" step="0.1" value={filters.maxROE} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, maxROE: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="minDebtToEquity" className="text-xs">Min D/E</Label>
                  <Input id="minDebtToEquity" type="number" step="0.1" value={filters.minDebtToEquity} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, minDebtToEquity: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxDebtToEquity" className="text-xs">Max D/E</Label>
                  <Input id="maxDebtToEquity" type="number" step="0.1" value={filters.maxDebtToEquity} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, maxDebtToEquity: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="minCurrentRatio" className="text-xs">Min Current</Label>
                  <Input id="minCurrentRatio" type="number" step="0.1" value={filters.minCurrentRatio} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, minCurrentRatio: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxCurrentRatio" className="text-xs">Max Current</Label>
                  <Input id="maxCurrentRatio" type="number" step="0.1" value={filters.maxCurrentRatio} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, maxCurrentRatio: Number(e.target.value) })} />
                </div>
              </div>
            </div>

            {/* Growth - Compact 4 columns */}
            <div className="space-y-1.5 border-t pt-2">
              <h4 className="text-xs font-semibold text-muted-foreground">Growth</h4>
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="minRevenueGrowth" className="text-xs">Min Rev %</Label>
                  <Input id="minRevenueGrowth" type="number" step="0.1" value={filters.minRevenueGrowth} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, minRevenueGrowth: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxRevenueGrowth" className="text-xs">Max Rev %</Label>
                  <Input id="maxRevenueGrowth" type="number" step="0.1" value={filters.maxRevenueGrowth} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, maxRevenueGrowth: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="minEarningsGrowth" className="text-xs">Min Earn %</Label>
                  <Input id="minEarningsGrowth" type="number" step="0.1" value={filters.minEarningsGrowth} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, minEarningsGrowth: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxEarningsGrowth" className="text-xs">Max Earn %</Label>
                  <Input id="maxEarningsGrowth" type="number" step="0.1" value={filters.maxEarningsGrowth} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, maxEarningsGrowth: Number(e.target.value) })} />
                </div>
              </div>
            </div>

            {/* Market Metrics - Compact 4 columns */}
            <div className="space-y-1.5 border-t pt-2">
              <h4 className="text-xs font-semibold text-muted-foreground">Market Metrics</h4>
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="minMarketCap" className="text-xs">Min Mkt Cap</Label>
                  <Input id="minMarketCap" type="number" value={filters.minMarketCap} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, minMarketCap: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxMarketCap" className="text-xs">Max Mkt Cap</Label>
                  <Input id="maxMarketCap" type="number" value={filters.maxMarketCap} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, maxMarketCap: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="minVolume" className="text-xs">Min Volume</Label>
                  <Input id="minVolume" type="number" value={filters.minVolume} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, minVolume: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxVolume" className="text-xs">Max Volume</Label>
                  <Input id="maxVolume" type="number" value={filters.maxVolume} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, maxVolume: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="minMomentum" className="text-xs">Min Mom %</Label>
                  <Input id="minMomentum" type="number" step="0.1" value={filters.minMomentum} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, minMomentum: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxMomentum" className="text-xs">Max Mom %</Label>
                  <Input id="maxMomentum" type="number" step="0.1" value={filters.maxMomentum} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, maxMomentum: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="minDividendYield" className="text-xs">Min Div %</Label>
                  <Input id="minDividendYield" type="number" step="0.1" value={filters.minDividendYield} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, minDividendYield: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxDividendYield" className="text-xs">Max Div %</Label>
                  <Input id="maxDividendYield" type="number" step="0.1" value={filters.maxDividendYield} className="h-8 text-sm"
                    onChange={(e) => setFilters({ ...filters, maxDividendYield: Number(e.target.value) })} />
                </div>
              </div>
            </div>

            {/* Actions - Compact */}
            <div className="flex items-center justify-between pt-3 border-t">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="default" className="gap-2" disabled={!filtersActive || totalFiltered === 0}>
                      <Plus className="h-3 w-3" />
                      Create Screen
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Earnings Screen</DialogTitle>
                      <DialogDescription>
                        Create a screen that trades stocks matching your filters
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="screenName">Screen Name</Label>
                        <Input 
                          id="screenName"
                          value={screenName}
                          onChange={(e) => setScreenName(e.target.value)}
                          placeholder="e.g., Quality Large Cap Earnings"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minSurprise">Min Earnings Surprise (%)</Label>
                        <Input 
                          id="minSurprise"
                          type="number"
                          step="0.1"
                          value={minEarningsSurprise}
                          onChange={(e) => setMinEarningsSurprise(Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Only trade stocks that beat estimates by this % or more
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="allocatedCapital">Allocated Capital (Paper Money) $</Label>
                        <Input 
                          id="allocatedCapital"
                          type="number"
                          step="100"
                          min="0"
                          value={allocatedCapital}
                          onChange={(e) => setAllocatedCapital(Number(e.target.value))}
                          placeholder="e.g., 1000"
                        />
                        <p className="text-xs text-muted-foreground">
                          Amount of paper (fake) money allocated to this strategy. New trades will divide remaining capital equally.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxPositions">Max Positions Per Day</Label>
                        <Input 
                          id="maxPositions"
                          type="number"
                          step="1"
                          min="5"
                          max="15"
                          value={maxPositions}
                          onChange={(e) => setMaxPositions(Math.max(5, Math.min(15, Number(e.target.value))))}
                          placeholder="10"
                        />
                        <p className="text-xs text-muted-foreground">
                          Maximum number of stocks to trade per day (5-15 range). Best opportunities are prioritized by surprise %.
                        </p>
                      </div>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          This screen will monitor {totalFiltered} stocks and trade them when they beat by {minEarningsSurprise}%+
                        </AlertDescription>
                      </Alert>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateScreen} disabled={isCreatingScreen}>
                        {isCreatingScreen ? 'Creating...' : 'Create Screen'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button size="sm" onClick={handleApplyFilters}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {filtersActive && (
        <Alert>
          <Filter className="h-4 w-4" />
          <AlertDescription>
            Showing {totalFiltered} of {totalOriginal} stocks that match your criteria
          </AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{filtersActive ? 'Filtered' : 'Total'} Earnings Reports</CardDescription>
            <CardTitle className="text-3xl">
              {totalFiltered}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Reporting Today</CardDescription>
            <CardTitle className="text-3xl">
              {filteredData.find(d => d.date === format(new Date(), 'yyyy-MM-dd'))?.earnings.length || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Days Covered</CardDescription>
            <CardTitle className="text-3xl">
              {filteredData.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Info Alert */}
      {earningsData.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No earnings data available. Run the earnings calendar fetch script to populate data for the next 30 days.
            <div className="mt-2">
              <code className="text-xs bg-muted px-2 py-1 rounded">
                cd nextjs_space && yarn tsx scripts/fetch-earnings-calendar.ts
              </code>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stock Selection Controls */}
      {totalFiltered > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSelectAll}
                  className="gap-2"
                >
                  <CheckSquare className="h-4 w-4" />
                  Select All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearSelection}
                  className="gap-2"
                >
                  <Square className="h-4 w-4" />
                  Clear Selection
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedSymbols.size} of {totalFiltered} selected
                </span>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    disabled={selectedSymbols.size === 0}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Earnings Monitor ({selectedSymbols.size} stocks)
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Earnings Monitor</DialogTitle>
                    <DialogDescription>
                      Monitor {selectedSymbols.size} selected stocks and trade them when they beat earnings
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="monitorName">Monitor Name</Label>
                      <Input 
                        id="monitorName"
                        value={screenName}
                        onChange={(e) => setScreenName(e.target.value)}
                        placeholder="e.g., Tech Earnings Picks"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minSurprise">Min Earnings Surprise (%)</Label>
                      <Input 
                        id="minSurprise"
                        type="number"
                        step="0.1"
                        value={minEarningsSurprise}
                        onChange={(e) => setMinEarningsSurprise(Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Only trade stocks that beat estimates by this % or more
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="allocatedCapital2">Allocated Capital (Paper Money) $</Label>
                      <Input 
                        id="allocatedCapital2"
                        type="number"
                        step="100"
                        min="0"
                        value={allocatedCapital}
                        onChange={(e) => setAllocatedCapital(Number(e.target.value))}
                        placeholder="e.g., 1000"
                      />
                      <p className="text-xs text-muted-foreground">
                        Amount of paper (fake) money allocated to this strategy. New trades will divide remaining capital equally.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxPositions2">Max Positions Per Day</Label>
                      <Input 
                        id="maxPositions2"
                        type="number"
                        step="1"
                        min="5"
                        max="15"
                        value={maxPositions}
                        onChange={(e) => setMaxPositions(Math.max(5, Math.min(15, Number(e.target.value))))}
                        placeholder="10"
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum number of stocks to trade per day (5-15 range). Best opportunities are prioritized by surprise %.
                      </p>
                    </div>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This will monitor {selectedSymbols.size} specific stocks:{' '}
                        <strong>{Array.from(selectedSymbols).slice(0, 5).join(', ')}
                        {selectedSymbols.size > 5 && ` +${selectedSymbols.size - 5} more`}</strong>
                      </AlertDescription>
                    </Alert>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateScreen} disabled={isCreatingScreen}>
                      {isCreatingScreen ? 'Creating...' : 'Create Monitor'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings by Date - Compact List View */}
      <div className="space-y-2">
        {filteredData.map((dayData) => {
          const isToday = dayData.date === format(new Date(), 'yyyy-MM-dd')
          const reportedCount = dayData.earnings.filter(e => e.actualEPS !== null).length
          const beatsCount = dayData.earnings.filter(e => e.beat === true).length
          const isExpanded = expandedDates.has(dayData.date)
          
          return (
            <Card key={dayData.date} className={isToday ? 'border-blue-500 border-2' : ''}>
              {/* Date Header - Clickable to expand/collapse */}
              <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleDateExpanded(dayData.date)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4 rotate-180" />}
                  <CalendarIcon className="h-4 w-4" />
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {format(parseISO(dayData.date), 'EEE, MMM d')}
                    </span>
                    {isToday && (
                      <Badge className="bg-blue-600 h-5 text-xs">Today</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={(e) => handleSelectAllForDate(dayData, e)}
                  >
                    <CheckSquare className="h-3 w-3 mr-1" />
                    Select All
                  </Button>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline" className="h-5">{dayData.earnings.length} reports</Badge>
                    {reportedCount > 0 && (
                      <>
                        <Badge variant="secondary" className="h-5">{reportedCount} reported</Badge>
                        <Badge className="bg-green-600 h-5">{beatsCount} beats</Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Earnings List - Shown when expanded */}
              {isExpanded && (
                <div className="border-t">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/30 text-xs font-medium text-muted-foreground">
                    <div className="col-span-1">Select</div>
                    <div className="col-span-1">Symbol</div>
                    <div className="col-span-1">Quarter</div>
                    <div className="col-span-1 text-right">Est EPS</div>
                    <div className="col-span-1 text-right">Act EPS</div>
                    <div className="col-span-1 text-right">Surprise</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-1 text-right">P/E</div>
                    <div className="col-span-1 text-right">Mkt Cap</div>
                    <div className="col-span-1 text-right">ROE</div>
                    <div className="col-span-1 text-right">Mom</div>
                    <div className="col-span-1 text-right">Volume</div>
                  </div>
                  
                  {/* Table Rows */}
                  {dayData.earnings.map((earning) => {
                    const stock = stockDataMap[earning.symbol]
                    return (
                      <div
                        key={earning.id}
                        className={`grid grid-cols-12 gap-2 px-3 py-2 text-xs border-t hover:bg-muted/30 transition-colors ${
                          earning.beat === true ? 'bg-green-50/50' :
                          earning.beat === false ? 'bg-red-50/50' : ''
                        }`}
                      >
                        <div className="col-span-1 flex items-center">
                          <Checkbox
                            checked={selectedSymbols.has(earning.symbol)}
                            onCheckedChange={() => handleToggleSymbol(earning.symbol)}
                          />
                        </div>
                        <div className="col-span-1 font-bold flex items-center">
                          {earning.symbol}
                        </div>
                        <div className="col-span-1 text-muted-foreground flex items-center">
                          {earning.fiscalQuarter} {String(earning.fiscalYear).slice(-2)}
                        </div>
                        <div className="col-span-1 text-right flex items-center justify-end">
                          {earning.estimatedEPS !== null ? `$${earning.estimatedEPS.toFixed(2)}` : '-'}
                        </div>
                        <div className={`col-span-1 text-right font-medium flex items-center justify-end ${
                          earning.beat === true ? 'text-green-600 font-bold' :
                          earning.beat === false ? 'text-red-600 font-bold' : ''
                        }`}>
                          {earning.actualEPS !== null ? `$${earning.actualEPS.toFixed(2)}` : '-'}
                        </div>
                        <div className={`col-span-1 text-right font-medium flex items-center justify-end ${
                          earning.surprise && earning.surprise >= 0 ? 'text-green-600 font-bold' :
                          earning.surprise && earning.surprise < 0 ? 'text-red-600 font-bold' : ''
                        }`}>
                          {earning.surprise !== null ? `${earning.surprise >= 0 ? '+' : ''}${earning.surprise.toFixed(1)}%` : '-'}
                        </div>
                        <div className="col-span-1 flex items-center">
                          {earning.beat !== null ? (
                            <Badge 
                              variant={earning.beat ? 'default' : 'destructive'}
                              className={`h-5 text-xs ${earning.beat ? 'bg-green-600' : ''}`}
                            >
                              {earning.beat ? 'Beat' : 'Miss'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Pending</span>
                          )}
                        </div>
                        <div className="col-span-1 text-right text-muted-foreground flex items-center justify-end">
                          {stock?.peRatio ? stock.peRatio.toFixed(1) : '-'}
                        </div>
                        <div className="col-span-1 text-right text-muted-foreground flex items-center justify-end">
                          {stock?.marketCap ? formatMarketCap(stock.marketCap) : '-'}
                        </div>
                        <div className="col-span-1 text-right text-muted-foreground flex items-center justify-end">
                          {stock?.roe ? `${stock.roe.toFixed(0)}%` : '-'}
                        </div>
                        <div className={`col-span-1 text-right flex items-center justify-end ${
                          stock?.momentum && stock.momentum > 0 ? 'text-green-600' :
                          stock?.momentum && stock.momentum < 0 ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          {stock?.momentum ? `${stock.momentum >= 0 ? '+' : ''}${stock.momentum.toFixed(0)}%` : '-'}
                        </div>
                        <div className="col-span-1 text-right text-muted-foreground flex items-center justify-end">
                          {stock?.volume ? (stock.volume >= 1e6 ? `${(stock.volume / 1e6).toFixed(1)}M` : `${(stock.volume / 1e3).toFixed(0)}K`) : '-'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
