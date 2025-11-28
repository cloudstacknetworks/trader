
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Settings,
  Key,
  DollarSign,
  Shield,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  Save,
  TestTube
} from 'lucide-react'

export function SettingsView() {
  const searchParams = useSearchParams()
  const [accountData, setAccountData] = useState<any>(null)
  const [screens, setScreens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown')
  const [activeTab, setActiveTab] = useState('account')

  const [formData, setFormData] = useState({
    alpacaApiKey: '',
    alpacaSecretKey: '',
    isPaperTrading: true,
    startingCapital: 1000,
    maxPositions: 5,
    trailingStopPct: 0.75,
    timeCutoffHour: 16,
    timeCutoffMin: 0,
    automationEnabled: true,
    emailNotifications: true,
    slackNotifications: false,
    slackChannel: '',
    dailySummaryEmail: true,
  })

  const [screenFormData, setScreenFormData] = useState({
    peRatioMax: 15,
    psRatioMax: 1.5,
    momentumMin: 5,
    marketCapMin: 50000000,
  })

  useEffect(() => {
    // Set active tab from URL parameter
    const tabFromUrl = searchParams?.get('tab')
    if (tabFromUrl && ['account', 'api', 'screens', 'automation'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountRes, screensRes] = await Promise.all([
          fetch('/api/account'),
          fetch('/api/screens')
        ])

        const accountData = await accountRes.json()
        const screensData = await screensRes.json()

        setAccountData(accountData)
        setScreens(screensData || [])

        if (accountData) {
          setFormData({
            alpacaApiKey: accountData.alpacaApiKey || '',
            alpacaSecretKey: accountData.alpacaSecretKey || '',
            isPaperTrading: accountData.isPaperTrading !== false,
            startingCapital: Number(accountData.startingCapital) || 1000,
            maxPositions: accountData.maxPositions || 5,
            trailingStopPct: Number(accountData.trailingStopPct) || 0.75,
            timeCutoffHour: accountData.timeCutoffHour || 16,
            timeCutoffMin: accountData.timeCutoffMin || 0,
            automationEnabled: accountData.automationEnabled !== false,
            emailNotifications: accountData.emailNotifications !== false,
            slackNotifications: accountData.slackNotifications || false,
            slackChannel: accountData.slackChannel || '',
            dailySummaryEmail: accountData.dailySummaryEmail !== false,
          })
        }

        // Set default screen parameters from the first value screen
        const valueScreen = screensData?.find((s: any) => s.name.includes('Value'))
        if (valueScreen) {
          setScreenFormData({
            peRatioMax: Number(valueScreen.peRatioMax) || 15,
            psRatioMax: Number(valueScreen.psRatioMax) || 1.5,
            momentumMin: Number(valueScreen.momentumMin) || 5,
            marketCapMin: Number(valueScreen.marketCapMin) || 50000000,
          })
        }
      } catch (error) {
        console.error('Error fetching settings data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSaveAccount = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const updatedAccount = await response.json()
        setAccountData(updatedAccount)
        alert('Account settings saved successfully!')
      } else {
        alert('Failed to save account settings')
      }
    } catch (error) {
      console.error('Error saving account settings:', error)
      alert('Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    if (!formData.alpacaApiKey || !formData.alpacaSecretKey) {
      alert('Please enter both API key and secret key')
      return
    }

    setTestingConnection(true)
    try {
      const response = await fetch('/api/test-alpaca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: formData.alpacaApiKey,
          secretKey: formData.alpacaSecretKey,
          isPaperTrading: formData.isPaperTrading,
        }),
      })

      if (response.ok) {
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('failed')
      }
    } catch (error) {
      console.error('Error testing connection:', error)
      setConnectionStatus('failed')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleUpdateScreen = async (screenId: string, updates: any) => {
    try {
      const response = await fetch(`/api/screens/${screenId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const updatedScreen = await response.json()
        setScreens(screens.map(s => s.id === screenId ? updatedScreen : s))
        alert('Screen updated successfully!')
      } else {
        alert('Failed to update screen')
      }
    } catch (error) {
      console.error('Error updating screen:', error)
      alert('Error updating screen')
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

  const isPaperTrading = formData.isPaperTrading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">
            Configure your trading parameters and API connections
          </p>
        </div>
        <Badge 
          variant={isPaperTrading ? "secondary" : "destructive"}
          className="px-3 py-1 text-sm font-medium"
        >
          {isPaperTrading ? 'Paper Trading' : 'Live Trading'}
        </Badge>
      </div>

      {/* Tab Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'account', label: 'Trading Account', icon: DollarSign },
              { key: 'api', label: 'API Configuration', icon: Key },
              { key: 'screens', label: 'Screening Criteria', icon: TrendingUp },
              { key: 'automation', label: 'Automation', icon: Clock }
            ].map((tab) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "outline"}
                className={activeTab === tab.key ? "bg-gradient-to-r from-blue-600 to-green-600" : ""}
                onClick={() => setActiveTab(tab.key)}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">

        {/* Trading Account Settings */}
        {activeTab === 'account' && (
          <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <span>Trading Parameters</span>
              </CardTitle>
              <CardDescription>
                Configure your position sizing and risk management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="startingCapital">Starting Capital ($)</Label>
                  <Input
                    id="startingCapital"
                    type="number"
                    min="100"
                    max="1000000"
                    value={formData.startingCapital}
                    onChange={(e) => setFormData({
                      ...formData,
                      startingCapital: Number(e.target.value)
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="maxPositions">Max Concurrent Positions</Label>
                  <Input
                    id="maxPositions"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.maxPositions}
                    onChange={(e) => setFormData({
                      ...formData,
                      maxPositions: Number(e.target.value)
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="trailingStopPct">Trailing Stop-Loss (%)</Label>
                  <Input
                    id="trailingStopPct"
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={formData.trailingStopPct}
                    onChange={(e) => setFormData({
                      ...formData,
                      trailingStopPct: Number(e.target.value)
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="timeCutoff">Daily Close Time (ET)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="timeCutoffHour"
                      type="number"
                      min="9"
                      max="16"
                      value={formData.timeCutoffHour}
                      onChange={(e) => setFormData({
                        ...formData,
                        timeCutoffHour: Number(e.target.value)
                      })}
                      className="w-20"
                    />
                    <span>:</span>
                    <Input
                      id="timeCutoffMin"
                      type="number"
                      min="0"
                      max="59"
                      step="15"
                      value={formData.timeCutoffMin}
                      onChange={(e) => setFormData({
                        ...formData,
                        timeCutoffMin: Number(e.target.value)
                      })}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPaperTrading"
                    checked={formData.isPaperTrading}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      isPaperTrading: checked
                    })}
                  />
                  <Label htmlFor="isPaperTrading" className="font-medium">
                    Paper Trading Mode
                  </Label>
                </div>
                <p className="text-sm text-gray-600">
                  {isPaperTrading 
                    ? 'Safe simulation mode - no real money at risk' 
                    : 'Live trading with real money'
                  }
                </p>
              </div>
              
              <Button 
                onClick={handleSaveAccount} 
                disabled={saving} 
                className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Trading Settings'}
              </Button>
            </CardContent>
          </Card>
          </div>
        )}

        {/* API Configuration */}
        {activeTab === 'api' && (
          <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5 text-blue-600" />
                <span>Alpaca API Configuration</span>
              </CardTitle>
              <CardDescription>
                Connect to your Alpaca brokerage account for automated trading
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!formData.alpacaApiKey && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <strong>Get your Alpaca API keys:</strong>
                    <br />
                    1. Create a free account at{' '}
                    <a 
                      href="https://alpaca.markets" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:underline font-medium"
                    >
                      alpaca.markets
                    </a>
                    <br />
                    2. Go to your dashboard and generate API keys
                    <br />
                    3. Start with paper trading keys for safe testing
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="alpacaApiKey">API Key</Label>
                  <Input
                    id="alpacaApiKey"
                    type="password"
                    value={formData.alpacaApiKey}
                    onChange={(e) => setFormData({
                      ...formData,
                      alpacaApiKey: e.target.value
                    })}
                    placeholder="Enter your Alpaca API key"
                  />
                </div>
                <div>
                  <Label htmlFor="alpacaSecretKey">Secret Key</Label>
                  <Input
                    id="alpacaSecretKey"
                    type="password"
                    value={formData.alpacaSecretKey}
                    onChange={(e) => setFormData({
                      ...formData,
                      alpacaSecretKey: e.target.value
                    })}
                    placeholder="Enter your Alpaca secret key"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={handleTestConnection}
                    disabled={testingConnection || !formData.alpacaApiKey || !formData.alpacaSecretKey}
                    variant="outline"
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    {testingConnection ? 'Testing...' : 'Test Connection'}
                  </Button>
                  
                  {connectionStatus !== 'unknown' && (
                    <Badge 
                      variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
                      className="flex items-center space-x-1"
                    >
                      {connectionStatus === 'connected' ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          <span>Connected</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3" />
                          <span>Failed</span>
                        </>
                      )}
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-gray-600">
                  {isPaperTrading ? 'Using paper trading endpoint' : 'Using live trading endpoint'}
                </p>
              </div>
              
              <Button 
                onClick={handleSaveAccount} 
                disabled={saving} 
                className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save API Configuration'}
              </Button>
            </CardContent>
          </Card>
          </div>
        )}

        {/* Screening Criteria */}
        {activeTab === 'screens' && (
          <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span>O'Shaughnessy Screening Criteria</span>
              </CardTitle>
              <CardDescription>
                Configure the fundamental and technical screening parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {screens.map((screen) => (
                <div key={screen.id} className="p-6 border border-gray-200 rounded-lg space-y-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{screen.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{screen.description}</p>
                    </div>
                    <Badge 
                      variant={screen.isActive ? "default" : "secondary"}
                      className={screen.isActive ? "bg-gradient-to-r from-blue-600 to-green-600" : ""}
                    >
                      {screen.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Max P/E Ratio</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={Number(screen.peRatioMax) || ''}
                        onChange={(e) => {
                          const value = Number(e.target.value)
                          handleUpdateScreen(screen.id, { peRatioMax: value })
                        }}
                      />
                    </div>
                    <div>
                      <Label>Max P/S Ratio</Label>
                      <Input
                        type="number"
                        min="0.1"
                        max="20"
                        step="0.1"
                        value={Number(screen.psRatioMax) || ''}
                        onChange={(e) => {
                          const value = Number(e.target.value)
                          handleUpdateScreen(screen.id, { psRatioMax: value })
                        }}
                      />
                    </div>
                    <div>
                      <Label>Min Momentum (%)</Label>
                      <Input
                        type="number"
                        min="-50"
                        max="100"
                        value={Number(screen.momentumMin) || ''}
                        onChange={(e) => {
                          const value = Number(e.target.value)
                          handleUpdateScreen(screen.id, { momentumMin: value })
                        }}
                      />
                    </div>
                    <div>
                      <Label>Min Market Cap ($M)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={Number(screen.marketCapMin) / 1000000 || ''}
                        onChange={(e) => {
                          const value = Number(e.target.value) * 1000000
                          handleUpdateScreen(screen.id, { marketCapMin: value })
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          </div>
        )}

        {/* Automation Settings */}
        {activeTab === 'automation' && (
          <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span>Automation & Notifications</span>
              </CardTitle>
              <CardDescription>
                Control automated trading and notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="automationEnabled"
                      checked={formData.automationEnabled}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        automationEnabled: checked
                      })}
                    />
                    <div>
                      <Label htmlFor="automationEnabled" className="font-semibold text-gray-900">
                        Enable Automated Trading
                      </Label>
                      <p className="text-sm text-gray-600 mt-1">
                        Automatically execute trades based on screening results
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="emailNotifications"
                      checked={formData.emailNotifications}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        emailNotifications: checked
                      })}
                    />
                    <div>
                      <Label htmlFor="emailNotifications" className="font-semibold text-gray-900">
                        Email Notifications
                      </Label>
                      <p className="text-sm text-gray-600 mt-1">
                        Receive email alerts for each trade execution
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="slackNotifications"
                      checked={formData.slackNotifications}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        slackNotifications: checked
                      })}
                    />
                    <div className="flex-1">
                      <Label htmlFor="slackNotifications" className="font-semibold text-gray-900">
                        Slack Notifications
                      </Label>
                      <p className="text-sm text-gray-600 mt-1">
                        Send real-time trade alerts to Slack
                      </p>
                      {formData.slackNotifications && (
                        <div className="mt-3">
                          <Input
                            type="text"
                            placeholder="#trading-alerts"
                            value={formData.slackChannel}
                            onChange={(e) => setFormData({
                              ...formData,
                              slackChannel: e.target.value
                            })}
                            className="w-64"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Enter channel name (e.g., #trading-alerts)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="dailySummaryEmail"
                      checked={formData.dailySummaryEmail}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        dailySummaryEmail: checked
                      })}
                    />
                    <div>
                      <Label htmlFor="dailySummaryEmail" className="font-semibold text-gray-900">
                        Daily Summary Email
                      </Label>
                      <p className="text-sm text-gray-600 mt-1">
                        Receive end-of-day trading summary at 4:30 PM ET
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Scheduled Tasks:</strong> The system runs automated tasks according to these schedules:
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Weekly screening: Sundays at 11:00 PM ET</li>
                    <li>• Daily news analysis: Weekdays at 7:00 AM ET</li>
                    <li>• Trade execution: Weekdays at 9:30 AM ET (market open)</li>
                    <li>• Position monitoring: Every 15 minutes during market hours</li>
                    <li>• Daily reports: Weekdays at 5:00 PM ET</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleSaveAccount} 
                disabled={saving} 
                className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Automation Settings'}
              </Button>
            </CardContent>
          </Card>
          </div>
        )}
      </div>
    </div>
  )
}
