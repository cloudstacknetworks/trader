
'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface PerformanceChartProps {
  currentValue: number
  totalPnl: number
}

export function PerformanceChart({ currentValue, totalPnl }: PerformanceChartProps) {
  const chartData = useMemo(() => {
    // Generate sample data for demonstration
    const data = []
    const startValue = currentValue - totalPnl
    const days = 30
    
    for (let i = 0; i <= days; i++) {
      const progress = i / days
      const value = startValue + (totalPnl * progress) + (Math.random() - 0.5) * 50
      
      data.push({
        date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
        value: Math.max(0, value),
        pnl: value - startValue
      })
    }
    
    return data
  }, [currentValue, totalPnl])

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 10 }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis 
          tick={{ fontSize: 10 }}
          tickLine={false}
          label={{ 
            value: 'Portfolio Value ($)', 
            angle: -90, 
            position: 'insideLeft',
            style: { textAnchor: 'middle', fontSize: 11 }
          }}
        />
        <Tooltip 
          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Portfolio Value']}
          labelFormatter={(date) => `Date: ${date}`}
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '12px'
          }}
        />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke="#3b82f6" 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#3b82f6' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
