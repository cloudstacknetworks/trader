'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface EarningsResult {
  symbol: string;
  earningsDate: string;
  estimatedEPS: number | null;
  actualEPS: number | null;
  surprise: number | null;
  beat: boolean | null;
  qualifiedBeat: boolean;
}

interface Trade {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  entryPrice: number;
  entryTime: string;
  exitPrice: number | null;
  exitTime: string | null;
  pnl: number | null;
}

interface EarningsResultsData {
  screen: {
    id: string;
    name: string;
    screenType: string;
    minEarningsSurprise: number;
    allocatedCapital: number | null;
  };
  earningsResults: EarningsResult[];
  trades: Trade[];
  summary: {
    totalMonitoredStocks: number;
    scheduledEarnings: number;
    reportedEarnings: number;
    beats: number;
    qualifiedBeats: number;
    misses: number;
    pending: number;
  };
}

interface EarningsResultsViewProps {
  screenId: string;
}

export default function EarningsResultsView({ screenId }: EarningsResultsViewProps) {
  const router = useRouter();
  const [data, setData] = useState<EarningsResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysBack, setDaysBack] = useState(7);

  const fetchEarningsResults = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const fromDate = new Date();
      fromDate.setDate(today.getDate() - daysBack);

      const response = await fetch(
        `/api/screens/${screenId}/earnings-results?from=${fromDate.toISOString().split('T')[0]}&to=${today.toISOString().split('T')[0]}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch earnings results');
      }

      const results = await response.json();
      setData(results);
    } catch (error) {
      console.error('Error fetching earnings results:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarningsResults();
  }, [screenId, daysBack]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading earnings results...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No Data Available</p>
              <p className="text-sm text-muted-foreground mb-4">
                Unable to load earnings results for this screen.
              </p>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { screen, earningsResults, trades, summary } = data;

  const getStatusBadge = (result: EarningsResult) => {
    if (result.actualEPS === null) {
      return <Badge variant="outline">Pending</Badge>;
    }
    if (result.qualifiedBeat) {
      return <Badge className="bg-green-600 text-white hover:bg-green-700">Qualified Beat</Badge>;
    }
    if (result.beat) {
      return <Badge className="bg-green-500 text-white hover:bg-green-600">Beat</Badge>;
    }
    return <Badge variant="destructive">Miss</Badge>;
  };

  const getSurpriseColor = (surprise: number | null) => {
    if (surprise === null) return 'text-muted-foreground';
    if (surprise >= screen.minEarningsSurprise) return 'text-green-600 font-semibold';
    if (surprise > 0) return 'text-green-500';
    return 'text-red-600';
  };

  const formatSurprise = (surprise: number | null) => {
    if (surprise === null) return 'N/A';
    const sign = surprise >= 0 ? '+' : '';
    return `${sign}${surprise.toFixed(2)}%`;
  };

  const formatEPS = (eps: number | null) => {
    if (eps === null) return 'N/A';
    return `$${eps.toFixed(2)}`;
  };

  const tradeExecutedForStock = (symbol: string) => {
    return trades.some(t => t.symbol === symbol);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Screens
          </Button>
          <h1 className="text-3xl font-bold">{screen.name}</h1>
          <p className="text-muted-foreground">Earnings Performance Report</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={daysBack === 7 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDaysBack(7)}
          >
            7 Days
          </Button>
          <Button
            variant={daysBack === 30 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDaysBack(30)}
          >
            30 Days
          </Button>
          <Button
            variant={daysBack === 90 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDaysBack(90)}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monitored</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalMonitoredStocks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.scheduledEarnings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reported</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.reportedEarnings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Beats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.beats}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Qualified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{summary.qualifiedBeats}</div>
            <p className="text-xs text-muted-foreground mt-1">≥{screen.minEarningsSurprise}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Misses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.misses}</div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings Results</CardTitle>
          <CardDescription>
            Detailed earnings performance for stocks in this screen (last {daysBack} days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {earningsResults.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No Earnings Scheduled</p>
              <p className="text-sm text-muted-foreground">
                None of the stocks in this screen had scheduled earnings in the selected period.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Ticker</th>
                    <th className="text-right py-3 px-4 font-medium">Est. EPS</th>
                    <th className="text-right py-3 px-4 font-medium">Actual EPS</th>
                    <th className="text-right py-3 px-4 font-medium">Surprise %</th>
                    <th className="text-center py-3 px-4 font-medium">Status</th>
                    <th className="text-center py-3 px-4 font-medium">Trade</th>
                  </tr>
                </thead>
                <tbody>
                  {earningsResults.map((result, index) => (
                    <tr key={`${result.symbol}-${result.earningsDate}-${index}`} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(result.earningsDate), 'MMM dd, yyyy')}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-medium">{result.symbol}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatEPS(result.estimatedEPS)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatEPS(result.actualEPS)}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono ${getSurpriseColor(result.surprise)}`}>
                        <div className="flex items-center justify-end gap-1">
                          {result.surprise !== null && result.surprise > 0 && (
                            <TrendingUp className="h-4 w-4" />
                          )}
                          {result.surprise !== null && result.surprise < 0 && (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {formatSurprise(result.surprise)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(result)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {tradeExecutedForStock(result.symbol) ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            ✓ Executed
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Executed Trades */}
      {trades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Executed Trades</CardTitle>
            <CardDescription>
              Trades triggered by qualified earnings beats in this screen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Ticker</th>
                    <th className="text-left py-3 px-4 font-medium">Side</th>
                    <th className="text-right py-3 px-4 font-medium">Quantity</th>
                    <th className="text-right py-3 px-4 font-medium">Entry Price</th>
                    <th className="text-right py-3 px-4 font-medium">Exit Price</th>
                    <th className="text-right py-3 px-4 font-medium">P&L</th>
                    <th className="text-center py-3 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <span className="font-mono font-medium">{trade.symbol}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={trade.side === 'BUY' ? 'default' : 'outline'}>
                          {trade.side}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">{trade.quantity}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        ${trade.entryPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {trade.pnl !== null ? (
                          <span className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={trade.exitTime ? 'outline' : 'default'}>
                          {trade.exitTime ? 'Closed' : 'Open'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
