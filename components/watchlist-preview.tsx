
'use client'

import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Stock {
  id: string
  ticker: string
  score: number
  currentPrice?: number
  momentum?: number
  sentimentScore?: number
  screen?: {
    name: string
  }
}

interface WatchlistPreviewProps {
  stocks: Stock[]
}

export function WatchlistPreview({ stocks }: WatchlistPreviewProps) {
  if (!stocks || stocks.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        No watchlist items available
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {stocks.map((stock) => {
        const score = Number(stock.score || 0)
        const currentPrice = Number(stock.currentPrice || 0)
        const momentum = Number(stock.momentum || 0)
        const sentiment = Number(stock.sentimentScore || 0)
        
        return (
          <div 
            key={stock.id} 
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{stock.ticker}</span>
                {momentum !== 0 && (
                  <div className="flex items-center">
                    {momentum > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span className={`text-xs ml-1 ${
                      momentum > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {momentum > 0 ? '+' : ''}{momentum.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 mt-1">
                {currentPrice > 0 && (
                  <span className="text-sm text-gray-600">
                    ${currentPrice.toFixed(2)}
                  </span>
                )}
                {stock.screen?.name && (
                  <Badge variant="outline" className="text-xs">
                    {stock.screen.name}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm font-medium text-blue-600">
                Score: {score.toFixed(1)}
              </div>
              {sentiment !== 0 && (
                <div className={`text-xs ${
                  sentiment > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  Sentiment: {sentiment > 0 ? '+' : ''}{sentiment.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
