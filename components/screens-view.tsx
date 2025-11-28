
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, Copy, Edit, Trash2, TrendingUp, AlertCircle, CheckCircle2, XCircle, RefreshCw, BarChart3 } from 'lucide-react'

interface Screen {
  id: string
  name: string
  description: string
  screenType: 'OSHAUGHNESSY' | 'EARNINGS'
  isActive: boolean
  // Valuation Metrics (O'Shaughnessy only)
  minPE?: number
  maxPE?: number
  minPS?: number
  maxPS?: number
  minPB?: number
  maxPB?: number
  minPCF?: number
  maxPCF?: number
  // Financial Health (O'Shaughnessy only)
  minROE?: number
  maxROE?: number
  minDebtToEquity?: number
  maxDebtToEquity?: number
  minCurrentRatio?: number
  maxCurrentRatio?: number
  // Growth Metrics (O'Shaughnessy only)
  minRevenueGrowth?: number
  maxRevenueGrowth?: number
  minEarningsGrowth?: number
  maxEarningsGrowth?: number
  // Income Metrics (O'Shaughnessy only)
  minDividendYield?: number
  maxDividendYield?: number
  // Market Metrics (both screen types)
  minMarketCap?: number
  maxMarketCap?: number
  minVolume?: number
  maxVolume?: number
  minMomentum?: number
  maxMomentum?: number
  // Earnings-specific fields
  minEarningsSurprise?: number // Minimum surprise % to trade
  // Capital tracking
  allocatedCapital?: number
  currentCapital?: number
  dailyCapitalHistory?: string // JSON string
  maxPositions?: number // Max positions per day (5-15)
  _count?: {
    watchlistItems: number
  }
}

interface ScreenFormData {
  name: string
  description: string
  screenType: 'OSHAUGHNESSY' | 'EARNINGS'
  isActive: boolean
  // Valuation Metrics
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
  // Growth Metrics
  minRevenueGrowth: number
  maxRevenueGrowth: number
  minEarningsGrowth: number
  maxEarningsGrowth: number
  // Income Metrics
  minDividendYield: number
  maxDividendYield: number
  // Market Metrics
  minMarketCap: number
  maxMarketCap: number
  minVolume: number
  maxVolume: number
  minMomentum: number
  maxMomentum: number
  // Earnings-specific
  minEarningsSurprise: number
  // Capital tracking
  allocatedCapital: number
  maxPositions: number
}

export default function ScreensView() {
  const router = useRouter()
  const [screens, setScreens] = useState<Screen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [refreshingScreen, setRefreshingScreen] = useState<string | null>(null)

  const [formData, setFormData] = useState<ScreenFormData>({
    name: '',
    description: '',
    screenType: 'OSHAUGHNESSY',
    isActive: false,
    // Valuation Metrics
    minPE: 0,
    maxPE: 999,
    minPS: 0,
    maxPS: 999,
    minPB: 0,
    maxPB: 999,
    minPCF: 0,
    maxPCF: 999,
    // Financial Health
    minROE: -999,
    maxROE: 999,
    minDebtToEquity: 0,
    maxDebtToEquity: 999,
    minCurrentRatio: 0,
    maxCurrentRatio: 999,
    // Growth Metrics
    minRevenueGrowth: -999,
    maxRevenueGrowth: 999,
    minEarningsGrowth: -999,
    maxEarningsGrowth: 999,
    // Income Metrics
    minDividendYield: 0,
    maxDividendYield: 999,
    // Market Metrics
    minMarketCap: 0,
    maxMarketCap: 999999999999,
    minVolume: 0,
    maxVolume: 999999999999,
    minMomentum: -999,
    maxMomentum: 999,
    // Earnings-specific
    minEarningsSurprise: 5.0,
    // Capital tracking
    allocatedCapital: 0,
    maxPositions: 10
  })

  useEffect(() => {
    fetchScreens()
  }, [])

  const fetchScreens = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Fetch screens
      const screensRes = await fetch('/api/screens')
      if (!screensRes.ok) throw new Error('Failed to fetch screens')
      const screensData = await screensRes.json()
      
      // Fetch watchlist to count items per screen
      const watchlistRes = await fetch('/api/watchlist')
      if (!watchlistRes.ok) throw new Error('Failed to fetch watchlist')
      const watchlistData = await watchlistRes.json()
      
      // Count items per screen
      const screenCounts: Record<string, number> = {}
      watchlistData.forEach((item: any) => {
        screenCounts[item.screenId] = (screenCounts[item.screenId] || 0) + 1
      })
      
      // Add counts to screens
      const screensWithCounts = screensData.map((screen: Screen) => ({
        ...screen,
        _count: { watchlistItems: screenCounts[screen.id] || 0 }
      }))
      
      setScreens(screensWithCounts)
    } catch (err: any) {
      setError(err.message || 'Failed to load screens')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setEditingScreen(null)
    setFormData({
      name: '',
      description: '',
      screenType: 'OSHAUGHNESSY',
      isActive: false,
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
      minMomentum: -999, maxMomentum: 999,
      minEarningsSurprise: 5.0,
      allocatedCapital: 0,
      maxPositions: 10
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (screen: Screen) => {
    setEditingScreen(screen)
    setFormData({
      name: screen.name,
      description: screen.description || '',
      screenType: screen.screenType || 'OSHAUGHNESSY',
      isActive: screen.isActive,
      minPE: screen.minPE || 0, maxPE: screen.maxPE || 999,
      minPS: screen.minPS || 0, maxPS: screen.maxPS || 999,
      minPB: screen.minPB || 0, maxPB: screen.maxPB || 999,
      minPCF: screen.minPCF || 0, maxPCF: screen.maxPCF || 999,
      minROE: screen.minROE || -999, maxROE: screen.maxROE || 999,
      minDebtToEquity: screen.minDebtToEquity || 0, maxDebtToEquity: screen.maxDebtToEquity || 999,
      minCurrentRatio: screen.minCurrentRatio || 0, maxCurrentRatio: screen.maxCurrentRatio || 999,
      minRevenueGrowth: screen.minRevenueGrowth || -999, maxRevenueGrowth: screen.maxRevenueGrowth || 999,
      minEarningsGrowth: screen.minEarningsGrowth || -999, maxEarningsGrowth: screen.maxEarningsGrowth || 999,
      minDividendYield: screen.minDividendYield || 0, maxDividendYield: screen.maxDividendYield || 999,
      minMarketCap: screen.minMarketCap || 0, maxMarketCap: screen.maxMarketCap || 999999999999,
      minVolume: screen.minVolume || 0, maxVolume: screen.maxVolume || 999999999999,
      minMomentum: screen.minMomentum || -999, maxMomentum: screen.maxMomentum || 999,
      minEarningsSurprise: screen.minEarningsSurprise || 5.0,
      allocatedCapital: screen.allocatedCapital || 0,
      maxPositions: screen.maxPositions || 10
    })
    setIsDialogOpen(true)
  }

  const handleClone = (screen: Screen) => {
    setEditingScreen(null)
    setFormData({
      name: `${screen.name} (Copy)`,
      description: screen.description || '',
      screenType: screen.screenType || 'OSHAUGHNESSY',
      isActive: false,
      minPE: screen.minPE || 0, maxPE: screen.maxPE || 999,
      minPS: screen.minPS || 0, maxPS: screen.maxPS || 999,
      minPB: screen.minPB || 0, maxPB: screen.maxPB || 999,
      minPCF: screen.minPCF || 0, maxPCF: screen.maxPCF || 999,
      minROE: screen.minROE || -999, maxROE: screen.maxROE || 999,
      minDebtToEquity: screen.minDebtToEquity || 0, maxDebtToEquity: screen.maxDebtToEquity || 999,
      minCurrentRatio: screen.minCurrentRatio || 0, maxCurrentRatio: screen.maxCurrentRatio || 999,
      minRevenueGrowth: screen.minRevenueGrowth || -999, maxRevenueGrowth: screen.maxRevenueGrowth || 999,
      minEarningsGrowth: screen.minEarningsGrowth || -999, maxEarningsGrowth: screen.maxEarningsGrowth || 999,
      minDividendYield: screen.minDividendYield || 0, maxDividendYield: screen.maxDividendYield || 999,
      minMarketCap: screen.minMarketCap || 0, maxMarketCap: screen.maxMarketCap || 999999999999,
      minVolume: screen.minVolume || 0, maxVolume: screen.maxVolume || 999999999999,
      minMomentum: screen.minMomentum || -999, maxMomentum: screen.maxMomentum || 999,
      minEarningsSurprise: screen.minEarningsSurprise || 5.0,
      allocatedCapital: screen.allocatedCapital || 0,
      maxPositions: screen.maxPositions || 10
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      setError('')
      setSuccess('')

      if (!formData.name.trim()) {
        setError('Screen name is required')
        return
      }

      const url = editingScreen ? `/api/screens/${editingScreen.id}` : '/api/screens'
      const method = editingScreen ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save screen')
      }

      setSuccess(editingScreen ? 'Screen updated successfully' : 'Screen created successfully')
      setIsDialogOpen(false)
      fetchScreens()
    } catch (err: any) {
      setError(err.message || 'Failed to save screen')
    }
  }

  const handleDelete = async (screenId: string) => {
    try {
      setError('')
      setSuccess('')

      const response = await fetch(`/api/screens/${screenId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete screen')
      }

      setSuccess('Screen deleted successfully')
      setDeleteConfirm(null)
      fetchScreens()
    } catch (err: any) {
      setError(err.message || 'Failed to delete screen')
    }
  }

  const handleToggleActive = async (screen: Screen) => {
    try {
      setError('')
      
      const response = await fetch(`/api/screens/${screen.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !screen.isActive })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update screen')
      }

      setSuccess(`Screen ${!screen.isActive ? 'activated' : 'deactivated'} successfully`)
      fetchScreens()
    } catch (err: any) {
      setError(err.message || 'Failed to update screen')
    }
  }

  const handleRefreshScreen = async (screenId: string, screenName: string) => {
    try {
      setError('')
      setSuccess('')
      setRefreshingScreen(screenId)
      
      const response = await fetch('/api/trading/run-screening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh screen')
      }

      setSuccess(`Screen "${screenName}" refreshed! Found ${data.stocksFound || 0} matching stocks.`)
      fetchScreens()
    } catch (err: any) {
      setError(err.message || 'Failed to refresh screen')
    } finally {
      setRefreshingScreen(null)
    }
  }

  const formatMarketCap = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`
    if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`
    return `$${value.toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading screens...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Screen Management</h1>
          <p className="text-muted-foreground mt-1">
            Create, test, and activate O&apos;Shaughnessy screening strategies
          </p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Screen
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Testing vs Trading:</strong> Create and test new screens with &quot;Active for Trading&quot; OFF.
          Only activate screens after verifying they yield good results. Active screens will be used for real trades.
        </AlertDescription>
      </Alert>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Screens</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{screens.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active for Trading</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {screens.filter(s => s.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stocks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {screens.reduce((sum, s) => sum + (s._count?.watchlistItems || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Screens List */}
      <div className="grid gap-4">
        {screens.map((screen) => (
          <Card key={screen.id} className={screen.isActive ? 'border-green-500' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-3">
                    <CardTitle>{screen.name}</CardTitle>
                    <Badge 
                      variant={screen.screenType === 'EARNINGS' ? 'default' : 'outline'}
                      className={screen.screenType === 'EARNINGS' ? 'bg-purple-600' : ''}
                    >
                      {screen.screenType === 'EARNINGS' ? '⚡ Earnings' : '📊 O\'Shaughnessy'}
                    </Badge>
                    {screen.isActive ? (
                      <Badge className="bg-green-600">Active for Trading</Badge>
                    ) : (
                      <Badge variant="outline">Testing Only</Badge>
                    )}
                    <Badge variant="secondary">
                      {screen._count?.watchlistItems || 0} stocks
                    </Badge>
                    {screen.allocatedCapital && screen.allocatedCapital > 0 && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        ${(screen.currentCapital || screen.allocatedCapital).toLocaleString()} / ${screen.allocatedCapital.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{screen.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRefreshScreen(screen.id, screen.name)}
                    disabled={refreshingScreen === screen.id}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshingScreen === screen.id ? 'animate-spin' : ''}`} />
                    {refreshingScreen === screen.id ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  {screen.screenType === 'EARNINGS' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/earnings-results/${screen.id}`)}
                      className="gap-2"
                    >
                      <BarChart3 className="h-4 w-4" />
                      View Results
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(screen)}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleClone(screen)}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Clone
                  </Button>
                  {deleteConfirm === screen.id ? (
                    <div className="flex gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(screen.id)}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirm(screen.id)}
                      className="gap-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">
                    {screen.isActive ? 'Active for Trading' : 'Testing Mode'}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {screen.isActive
                      ? 'This screen is being used for live trading decisions'
                      : 'Enable this to use screen for actual trades'}
                  </p>
                </div>
                <Switch
                  checked={screen.isActive}
                  onCheckedChange={() => handleToggleActive(screen)}
                />
              </div>

              {/* Criteria */}
              {screen.screenType === 'EARNINGS' ? (
                // Earnings Screen Criteria
                <div className="space-y-3">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Earnings Strategy:</strong> Trades stocks that beat earnings by {screen.minEarningsSurprise || 5}%+ on their reporting date.
                      {(screen.minMarketCap && screen.minMarketCap > 0) || (screen.maxMarketCap && screen.maxMarketCap < 999999999999) 
                        ? ` Filtered by market cap.` 
                        : ' No market cap filter.'}
                    </AlertDescription>
                  </Alert>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Min Earnings Surprise</p>
                      <p className="font-medium text-purple-600">{screen.minEarningsSurprise || 5.0}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Market Cap Range</p>
                      <p className="font-medium">
                        {formatMarketCap(screen.minMarketCap || 0)} - {formatMarketCap(screen.maxMarketCap || 999999999999)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Min Volume</p>
                      <p className="font-medium">{(screen.minVolume || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ) : (
                // O'Shaughnessy Screen Criteria
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Market Cap</p>
                    <p className="font-medium">
                      {formatMarketCap(screen.minMarketCap || 0)} - {formatMarketCap(screen.maxMarketCap || 999999999999)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">P/E Ratio</p>
                    <p className="font-medium">
                      {screen.minPE || 0} - {screen.maxPE || 999}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">P/S Ratio</p>
                    <p className="font-medium">
                      {screen.minPS || 0} - {screen.maxPS || 999}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Momentum</p>
                    <p className="font-medium">{screen.minMomentum || 0}% - {screen.maxMomentum || 999}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Volume</p>
                    <p className="font-medium">{(screen.minVolume || 0).toLocaleString()} - {(screen.maxVolume || 999999999999).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {screens.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No screens yet</p>
              <p className="text-muted-foreground mb-4">
                Create your first O&apos;Shaughnessy screening strategy to get started
              </p>
              <Button onClick={handleCreateNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Screen
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingScreen ? 'Edit Screen' : 'Create New Screen'}
            </DialogTitle>
            <DialogDescription>
              {editingScreen
                ? 'Modify the screening criteria below'
                : 'Define your O\'Shaughnessy screening criteria'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Screen Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Small Cap Value"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the screening strategy"
              />
            </div>

            {/* Screen Type */}
            <div className="space-y-2">
              <Label htmlFor="screenType">Screen Type *</Label>
              <select
                id="screenType"
                value={formData.screenType}
                onChange={(e) => setFormData({ ...formData, screenType: e.target.value as 'OSHAUGHNESSY' | 'EARNINGS' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="OSHAUGHNESSY">O'Shaughnessy (Value/Growth Screening)</option>
                <option value="EARNINGS">Earnings Beats (Day Trading)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {formData.screenType === 'OSHAUGHNESSY' 
                  ? 'Traditional screening using financial ratios, then trading on positive news'
                  : 'Day trading stocks that beat earnings expectations (no pre-screening required)'}
              </p>
            </div>

            {/* Earnings-Specific Fields */}
            {formData.screenType === 'EARNINGS' && (
              <div className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">Earnings Strategy Settings</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="minEarningsSurprise">Minimum Earnings Surprise %</Label>
                  <Input
                    id="minEarningsSurprise"
                    type="number"
                    step="0.1"
                    value={formData.minEarningsSurprise}
                    onChange={(e) => setFormData({ ...formData, minEarningsSurprise: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only trade stocks that beat estimates by this % or more (e.g., 5.0 = beat by 5%+)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allocatedCapital">Allocated Capital (Paper Money) $</Label>
                  <Input
                    id="allocatedCapital"
                    type="number"
                    step="100"
                    min="0"
                    value={formData.allocatedCapital}
                    onChange={(e) => setFormData({ ...formData, allocatedCapital: Number(e.target.value) })}
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
                    value={formData.maxPositions}
                    onChange={(e) => setFormData({ ...formData, maxPositions: Math.max(5, Math.min(15, Number(e.target.value))) })}
                    placeholder="10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of stocks to trade per day (5-15 range). Best opportunities are prioritized by earnings surprise %.
                  </p>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Market Cap & Volume filters below</strong> can be used to restrict which earnings beats to trade.
                    All other O'Shaughnessy criteria (P/E, ROE, etc.) are ignored for earnings screens.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* O'Shaughnessy Valuation Metrics */}
            {formData.screenType === 'OSHAUGHNESSY' && (
              <>
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Valuation Metrics</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minPE">Min P/E Ratio</Label>
                  <Input id="minPE" type="number" step="0.1" value={formData.minPE}
                    onChange={(e) => setFormData({ ...formData, minPE: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPE">Max P/E Ratio</Label>
                  <Input id="maxPE" type="number" step="0.1" value={formData.maxPE}
                    onChange={(e) => setFormData({ ...formData, maxPE: Number(e.target.value) })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minPS">Min P/S Ratio</Label>
                  <Input id="minPS" type="number" step="0.1" value={formData.minPS}
                    onChange={(e) => setFormData({ ...formData, minPS: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPS">Max P/S Ratio</Label>
                  <Input id="maxPS" type="number" step="0.1" value={formData.maxPS}
                    onChange={(e) => setFormData({ ...formData, maxPS: Number(e.target.value) })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minPB">Min P/B Ratio</Label>
                  <Input id="minPB" type="number" step="0.1" value={formData.minPB}
                    onChange={(e) => setFormData({ ...formData, minPB: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPB">Max P/B Ratio</Label>
                  <Input id="maxPB" type="number" step="0.1" value={formData.maxPB}
                    onChange={(e) => setFormData({ ...formData, maxPB: Number(e.target.value) })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minPCF">Min P/CF Ratio</Label>
                  <Input id="minPCF" type="number" step="0.1" value={formData.minPCF}
                    onChange={(e) => setFormData({ ...formData, minPCF: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPCF">Max P/CF Ratio</Label>
                  <Input id="maxPCF" type="number" step="0.1" value={formData.maxPCF}
                    onChange={(e) => setFormData({ ...formData, maxPCF: Number(e.target.value) })} />
                </div>
              </div>
            </div>

            {/* Financial Health */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Financial Health</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minROE">Min ROE (%)</Label>
                  <Input id="minROE" type="number" step="0.1" value={formData.minROE}
                    onChange={(e) => setFormData({ ...formData, minROE: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxROE">Max ROE (%)</Label>
                  <Input id="maxROE" type="number" step="0.1" value={formData.maxROE}
                    onChange={(e) => setFormData({ ...formData, maxROE: Number(e.target.value) })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minDebtToEquity">Min Debt/Equity</Label>
                  <Input id="minDebtToEquity" type="number" step="0.1" value={formData.minDebtToEquity}
                    onChange={(e) => setFormData({ ...formData, minDebtToEquity: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxDebtToEquity">Max Debt/Equity</Label>
                  <Input id="maxDebtToEquity" type="number" step="0.1" value={formData.maxDebtToEquity}
                    onChange={(e) => setFormData({ ...formData, maxDebtToEquity: Number(e.target.value) })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minCurrentRatio">Min Current Ratio</Label>
                  <Input id="minCurrentRatio" type="number" step="0.1" value={formData.minCurrentRatio}
                    onChange={(e) => setFormData({ ...formData, minCurrentRatio: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxCurrentRatio">Max Current Ratio</Label>
                  <Input id="maxCurrentRatio" type="number" step="0.1" value={formData.maxCurrentRatio}
                    onChange={(e) => setFormData({ ...formData, maxCurrentRatio: Number(e.target.value) })} />
                </div>
              </div>
            </div>

            {/* Growth Metrics */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Growth Metrics</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minRevenueGrowth">Min Revenue Growth (%)</Label>
                  <Input id="minRevenueGrowth" type="number" step="0.1" value={formData.minRevenueGrowth}
                    onChange={(e) => setFormData({ ...formData, minRevenueGrowth: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxRevenueGrowth">Max Revenue Growth (%)</Label>
                  <Input id="maxRevenueGrowth" type="number" step="0.1" value={formData.maxRevenueGrowth}
                    onChange={(e) => setFormData({ ...formData, maxRevenueGrowth: Number(e.target.value) })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minEarningsGrowth">Min Earnings Growth (%)</Label>
                  <Input id="minEarningsGrowth" type="number" step="0.1" value={formData.minEarningsGrowth}
                    onChange={(e) => setFormData({ ...formData, minEarningsGrowth: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxEarningsGrowth">Max Earnings Growth (%)</Label>
                  <Input id="maxEarningsGrowth" type="number" step="0.1" value={formData.maxEarningsGrowth}
                    onChange={(e) => setFormData({ ...formData, maxEarningsGrowth: Number(e.target.value) })} />
                </div>
              </div>
            </div>

            {/* Income Metrics */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Income Metrics</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minDividendYield">Min Dividend Yield (%)</Label>
                  <Input id="minDividendYield" type="number" step="0.1" value={formData.minDividendYield}
                    onChange={(e) => setFormData({ ...formData, minDividendYield: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxDividendYield">Max Dividend Yield (%)</Label>
                  <Input id="maxDividendYield" type="number" step="0.1" value={formData.maxDividendYield}
                    onChange={(e) => setFormData({ ...formData, maxDividendYield: Number(e.target.value) })} />
                </div>
              </div>
            </div>
            </>
            )}

            {/* Market Metrics (Available for both screen types) */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Market Metrics</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minMarketCap">Min Market Cap ($)</Label>
                  <Input id="minMarketCap" type="number" value={formData.minMarketCap}
                    onChange={(e) => setFormData({ ...formData, minMarketCap: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">
                    Current: {formatMarketCap(formData.minMarketCap)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxMarketCap">Max Market Cap ($)</Label>
                  <Input id="maxMarketCap" type="number" value={formData.maxMarketCap}
                    onChange={(e) => setFormData({ ...formData, maxMarketCap: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">
                    Current: {formatMarketCap(formData.maxMarketCap)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minVolume">Min Volume</Label>
                  <Input id="minVolume" type="number" value={formData.minVolume}
                    onChange={(e) => setFormData({ ...formData, minVolume: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxVolume">Max Volume</Label>
                  <Input id="maxVolume" type="number" value={formData.maxVolume}
                    onChange={(e) => setFormData({ ...formData, maxVolume: Number(e.target.value) })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minMomentum">Min Momentum (%)</Label>
                  <Input id="minMomentum" type="number" step="0.1" value={formData.minMomentum}
                    onChange={(e) => setFormData({ ...formData, minMomentum: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">6-month price momentum</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxMomentum">Max Momentum (%)</Label>
                  <Input id="maxMomentum" type="number" step="0.1" value={formData.maxMomentum}
                    onChange={(e) => setFormData({ ...formData, maxMomentum: Number(e.target.value) })} />
                </div>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="isActive" className="text-base">
                  Active for Trading
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable this to use screen for actual trades
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingScreen ? 'Save Changes' : 'Create Screen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
