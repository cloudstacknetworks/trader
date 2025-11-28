
'use client'

interface Position {
  id: string
  ticker: string
  quantity: number
  entryPrice: number
  currentPrice?: number
  unrealizedPnl: number
  entryTime: string
}

interface PositionsTableProps {
  positions: Position[]
  compact?: boolean
}

export function PositionsTable({ positions, compact = false }: PositionsTableProps) {
  if (!positions || positions.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        No positions available
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {positions.map((position) => {
        const unrealizedPnl = Number(position.unrealizedPnl || 0)
        const currentPrice = Number(position.currentPrice || position.entryPrice)
        const entryPrice = Number(position.entryPrice)
        const pnlPercentage = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice * 100) : 0
        
        return (
          <div 
            key={position.id} 
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{position.ticker}</span>
                <span className="text-sm text-gray-600">
                  {position.quantity} shares
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Entry: ${entryPrice.toFixed(2)} • Current: ${currentPrice.toFixed(2)}
              </div>
            </div>
            
            <div className="text-right">
              <div className={`font-medium text-sm ${
                unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
              </div>
              <div className={`text-xs ${
                pnlPercentage >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
