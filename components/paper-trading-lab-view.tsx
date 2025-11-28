
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  Play, 
  Square, 
  Trash2, 
  Eye, 
  BarChart3, 
  PlusCircle,
  Trophy,
  Activity,
  Target,
  AlertCircle,
  Calendar,
  DollarSign
} from 'lucide-react';

interface PaperTradingRun {
  id: string;
  name: string;
  description?: string;
  screenId?: string;
  screen?: {
    id: string;
    name: string;
  };
  runType: 'LIVE' | 'HISTORICAL';
  startDate: string;
  endDate?: string;
  startingCapital: number;
  maxPositions: number;
  trailingStopPct: number;
  status: 'RUNNING' | 'COMPLETED' | 'STOPPED' | 'FAILED';
  finalCapital?: number;
  totalReturn?: number;
  totalReturnDollars?: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate?: number;
  avgWinAmount?: number;
  avgLossAmount?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  profitFactor?: number;
  avgHoldTimeDays?: number;
  notes?: string;
  createdAt: string;
  completedAt?: string;
  _count?: {
    trades: number;
  };
  trades?: any[];
}

interface Screen {
  id: string;
  name: string;
}

export function PaperTradingLabView() {
  const [runs, setRuns] = useState<PaperTradingRun[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<PaperTradingRun | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state for creating new run
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    screenId: '',
    runType: 'HISTORICAL',
    startDate: '',
    endDate: '',
    startingCapital: '100000',
    maxPositions: '5',
    trailingStopPct: '15'
  });

  useEffect(() => {
    fetchRuns();
    fetchScreens();
  }, []);

  const fetchRuns = async () => {
    try {
      const response = await fetch('/api/paper-trading-runs');
      if (response.ok) {
        const data = await response.json();
        setRuns(data.runs || []);
      }
    } catch (error) {
      console.error('Error fetching runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchScreens = async () => {
    try {
      const response = await fetch('/api/screens');
      if (response.ok) {
        const data = await response.json();
        setScreens(data.screens || []);
      }
    } catch (error) {
      console.error('Error fetching screens:', error);
    }
  };

  const handleCreateRun = async () => {
    if (!formData.name || !formData.startDate || !formData.startingCapital) {
      alert('Please fill in required fields: Name, Start Date, and Starting Capital');
      return;
    }

    if (formData.runType === 'HISTORICAL' && !formData.endDate) {
      alert('Historical runs require an end date');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/paper-trading-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setFormData({
          name: '',
          description: '',
          screenId: '',
          runType: 'HISTORICAL',
          startDate: '',
          endDate: '',
          startingCapital: '100000',
          maxPositions: '5',
          trailingStopPct: '15'
        });
        
        // Wait a moment for the backtest to start
        setTimeout(() => {
          fetchRuns();
        }, 1000);
      } else {
        const error = await response.json();
        alert(`Error creating run: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating run:', error);
      alert('Failed to create paper trading run');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStopRun = async (runId: string) => {
    if (!confirm('Are you sure you want to stop this run? All open positions will be closed.')) {
      return;
    }

    try {
      const response = await fetch(`/api/paper-trading-runs/${runId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });

      if (response.ok) {
        fetchRuns();
      } else {
        const error = await response.json();
        alert(`Error stopping run: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error stopping run:', error);
      alert('Failed to stop run');
    }
  };

  const handleDeleteRun = async (runId: string) => {
    if (!confirm('Are you sure you want to delete this run? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/paper-trading-runs/${runId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchRuns();
      } else {
        const error = await response.json();
        alert(`Error deleting run: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting run:', error);
      alert('Failed to delete run');
    }
  };

  const handleViewDetails = async (runId: string) => {
    try {
      const response = await fetch(`/api/paper-trading-runs/${runId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedRun(data.run);
        setShowDetailsDialog(true);
      }
    } catch (error) {
      console.error('Error fetching run details:', error);
    }
  };

  // Calculate summary statistics
  const completedRuns = runs.filter(r => r.status === 'COMPLETED' || r.status === 'STOPPED');
  const bestPerformer = completedRuns.reduce((best, run) => {
    const bestReturn = best?.totalReturn || -Infinity;
    const currentReturn = run.totalReturn || -Infinity;
    return currentReturn > bestReturn ? run : best;
  }, null as PaperTradingRun | null);

  const avgWinRate = completedRuns.length > 0
    ? completedRuns.reduce((sum, run) => sum + (run.winRate || 0), 0) / completedRuns.length
    : 0;

  const activeRuns = runs.filter(r => r.status === 'RUNNING');

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
      RUNNING: 'default',
      COMPLETED: 'secondary',
      STOPPED: 'outline',
      FAILED: 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const formatted = value.toFixed(2);
    return value >= 0 ? `+${formatted}%` : `${formatted}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading Paper Trading Lab...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Paper Trading Lab 🧪
          </h1>
          <p className="text-muted-foreground mt-2">
            Test multiple strategies, track performance, and discover what works best
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <PlusCircle className="w-5 h-5" />
              New Run
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Paper Trading Run</DialogTitle>
              <DialogDescription>
                Configure your paper trading experiment. Historical runs complete instantly, live runs track in real-time.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Run Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Conservative Value - Nov 2025"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="Notes about this strategy..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="screenId">Screen Strategy</Label>
                  <Select
                    value={formData.screenId}
                    onValueChange={(value) => setFormData({ ...formData, screenId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select screen" />
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
                  <Label htmlFor="runType">Run Type</Label>
                  <Select
                    value={formData.runType}
                    onValueChange={(value) => setFormData({ ...formData, runType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HISTORICAL">Historical Backtest</SelectItem>
                      <SelectItem value="LIVE">Live Paper Trading</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">
                    End Date {formData.runType === 'HISTORICAL' && '*'}
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="startingCapital">Starting Capital *</Label>
                  <Input
                    id="startingCapital"
                    type="number"
                    placeholder="100000"
                    value={formData.startingCapital}
                    onChange={(e) => setFormData({ ...formData, startingCapital: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="maxPositions">Max Positions</Label>
                  <Input
                    id="maxPositions"
                    type="number"
                    placeholder="5"
                    value={formData.maxPositions}
                    onChange={(e) => setFormData({ ...formData, maxPositions: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="trailingStopPct">Trailing Stop %</Label>
                  <Input
                    id="trailingStopPct"
                    type="number"
                    step="0.1"
                    placeholder="15.0"
                    value={formData.trailingStopPct}
                    onChange={(e) => setFormData({ ...formData, trailingStopPct: e.target.value })}
                  />
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Historical runs execute instantly on past data. Live runs track in real-time and can be stopped anytime.
                </AlertDescription>
              </Alert>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRun} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Run'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Runs</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRuns.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Performer</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bestPerformer ? formatPercent(bestPerformer.totalReturn || 0) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {bestPerformer ? bestPerformer.name : 'No completed runs'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedRuns.length} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Win Rate</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedRuns.length > 0 ? `${avgWinRate.toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all completed runs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Runs List */}
      <Card>
        <CardHeader>
          <CardTitle>All Paper Trading Runs</CardTitle>
          <CardDescription>
            View and manage your paper trading experiments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Paper Trading Runs Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first paper trading run to start testing strategies
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Create First Run
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{run.name}</h3>
                        {getStatusBadge(run.status)}
                        {run.runType === 'LIVE' && (
                          <Badge variant="outline">
                            <Play className="w-3 h-3 mr-1" />
                            Live
                          </Badge>
                        )}
                      </div>
                      {run.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {run.description}
                        </p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Strategy</div>
                          <div className="font-medium">{run.screen?.name || 'None'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Period</div>
                          <div className="font-medium">
                            {formatDate(run.startDate)}
                            {run.endDate && ` - ${formatDate(run.endDate)}`}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Capital</div>
                          <div className="font-medium">
                            {formatCurrency(run.startingCapital)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Trades</div>
                          <div className="font-medium">{run.totalTrades}</div>
                        </div>
                      </div>
                      {(run.status === 'COMPLETED' || run.status === 'STOPPED') && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3 pt-3 border-t">
                          <div>
                            <div className="text-muted-foreground">Total Return</div>
                            <div className={`font-bold ${(run.totalReturn || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercent(run.totalReturn || 0)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Win Rate</div>
                            <div className="font-medium">{(run.winRate || 0).toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Sharpe Ratio</div>
                            <div className="font-medium">{(run.sharpeRatio || 0).toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Max Drawdown</div>
                            <div className="font-medium text-red-600">
                              -{(run.maxDrawdown || 0).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(run.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {run.status === 'RUNNING' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStopRun(run.id)}
                        >
                          <Square className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteRun(run.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedRun && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedRun.name}</DialogTitle>
                <DialogDescription>
                  Detailed results and trade history
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Configuration */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Configuration</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Strategy:</span>{' '}
                      <span className="font-medium">{selectedRun.screen?.name || 'None'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>{' '}
                      <span className="font-medium">{selectedRun.runType}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Starting Capital:</span>{' '}
                      <span className="font-medium">{formatCurrency(selectedRun.startingCapital)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Max Positions:</span>{' '}
                      <span className="font-medium">{selectedRun.maxPositions}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Trailing Stop:</span>{' '}
                      <span className="font-medium">{selectedRun.trailingStopPct}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Period:</span>{' '}
                      <span className="font-medium">
                        {formatDate(selectedRun.startDate)}
                        {selectedRun.endDate && ` - ${formatDate(selectedRun.endDate)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                {(selectedRun.status === 'COMPLETED' || selectedRun.status === 'STOPPED') && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Performance Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Total Return</div>
                          <div className={`text-2xl font-bold ${(selectedRun.totalReturn || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercent(selectedRun.totalReturn || 0)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {formatCurrency(selectedRun.totalReturnDollars || 0)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Win Rate</div>
                          <div className="text-2xl font-bold">
                            {(selectedRun.winRate || 0).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {selectedRun.winningTrades}W / {selectedRun.losingTrades}L
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                          <div className="text-2xl font-bold">
                            {(selectedRun.sharpeRatio || 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Risk-adjusted return
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Max Drawdown</div>
                          <div className="text-2xl font-bold text-red-600">
                            -{(selectedRun.maxDrawdown || 0).toFixed(2)}%
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Largest peak-to-trough decline
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Profit Factor</div>
                          <div className="text-2xl font-bold">
                            {(selectedRun.profitFactor || 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Gross profit / Gross loss
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Avg Hold Time</div>
                          <div className="text-2xl font-bold">
                            {(selectedRun.avgHoldTimeDays || 0).toFixed(1)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Days per trade
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Trade History */}
                {selectedRun.trades && selectedRun.trades.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Trade History ({selectedRun.trades.length} trades)
                    </h3>
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="text-left p-3">Ticker</th>
                            <th className="text-right p-3">Entry</th>
                            <th className="text-right p-3">Exit</th>
                            <th className="text-right p-3">P&L</th>
                            <th className="text-right p-3">Days</th>
                            <th className="text-left p-3">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRun.trades.map((trade: any, idx: number) => (
                            <tr key={idx} className="border-t">
                              <td className="p-3 font-medium">{trade.ticker}</td>
                              <td className="text-right p-3">{formatCurrency(trade.entryPrice)}</td>
                              <td className="text-right p-3">{formatCurrency(trade.exitPrice || 0)}</td>
                              <td className={`text-right p-3 font-bold ${(trade.realizedPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(trade.realizedPnl || 0)}
                              </td>
                              <td className="text-right p-3">
                                {((trade.holdTimeMinutes || 0) / (60 * 24)).toFixed(1)}
                              </td>
                              <td className="p-3">
                                <Badge variant="outline" className="text-xs">
                                  {trade.exitReason || 'N/A'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Notes Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Notes</h3>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    {selectedRun.notes || 'No notes added yet'}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
