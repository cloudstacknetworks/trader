
import { prisma } from '@/lib/db'
import { finnhubClient } from '@/lib/finnhub'
import { createAlpacaClient, AlpacaClient } from '@/lib/alpaca'
import { notificationService } from '@/lib/notification-service'

export class TradingEngine {
  private alpacaClient: AlpacaClient | null = null

  async initializeAlpaca(userId: string) {
    const account = await prisma.tradingAccount.findUnique({
      where: { userId },
    })

    if (!account?.alpacaApiKey || !account?.alpacaSecretKey) {
      throw new Error('Alpaca API credentials not configured')
    }

    this.alpacaClient = createAlpacaClient({
      apiKey: account.alpacaApiKey,
      secretKey: account.alpacaSecretKey,
      isPaperTrading: account.isPaperTrading,
    })

    return this.alpacaClient
  }

  async runOShaughnessyScreening(specificScreenId?: string) {
    console.log('Starting O\'Shaughnessy screening (LOCAL DATA MODE)...')

    const screens = await prisma.screen.findMany({
      where: specificScreenId ? { id: specificScreenId } : { isActive: true },
    })

    if (screens.length === 0) {
      console.log('No screens found to run')
      return { message: 'No screens found', screensProcessed: 0, stocksFound: 0 }
    }

    let totalStocksFound = 0
    
    for (const screen of screens) {
      console.log(`\n========================================`)
      console.log(`Running screen: ${screen.name} (ID: ${screen.id})`)
      console.log(`========================================`)
      
      // Build SQL WHERE clause based on screening criteria
      const where: any = {
        hasError: false, // Only include stocks without errors
        dataQuality: { gte: 30 }, // Minimum 30% data quality
      }
      
      // Valuation Metrics
      if (screen.minPE || screen.maxPE || screen.peRatioMax) {
        where.peRatio = {
          gte: screen.minPE ? Number(screen.minPE) : undefined,
          lte: (screen.maxPE || screen.peRatioMax) ? Number(screen.maxPE || screen.peRatioMax) : undefined,
          not: null,
        }
      }
      
      if (screen.minPS || screen.maxPS || screen.psRatioMax) {
        where.psRatio = {
          gte: screen.minPS ? Number(screen.minPS) : undefined,
          lte: (screen.maxPS || screen.psRatioMax) ? Number(screen.maxPS || screen.psRatioMax) : undefined,
          not: null,
        }
      }
      
      if (screen.minPB || screen.maxPB) {
        where.pbRatio = {
          gte: screen.minPB ? Number(screen.minPB) : undefined,
          lte: screen.maxPB ? Number(screen.maxPB) : undefined,
          not: null,
        }
      }
      
      if (screen.minPCF || screen.maxPCF) {
        where.pcfRatio = {
          gte: screen.minPCF ? Number(screen.minPCF) : undefined,
          lte: screen.maxPCF ? Number(screen.maxPCF) : undefined,
          not: null,
        }
      }
      
      // Financial Health
      if (screen.minROE || screen.maxROE) {
        where.roe = {
          gte: screen.minROE ? Number(screen.minROE) : undefined,
          lte: screen.maxROE ? Number(screen.maxROE) : undefined,
          not: null,
        }
      }
      
      if (screen.minDebtToEquity || screen.maxDebtToEquity) {
        where.debtToEquity = {
          gte: screen.minDebtToEquity ? Number(screen.minDebtToEquity) : undefined,
          lte: screen.maxDebtToEquity ? Number(screen.maxDebtToEquity) : undefined,
          not: null,
        }
      }
      
      if (screen.minCurrentRatio || screen.maxCurrentRatio) {
        where.currentRatio = {
          gte: screen.minCurrentRatio ? Number(screen.minCurrentRatio) : undefined,
          lte: screen.maxCurrentRatio ? Number(screen.maxCurrentRatio) : undefined,
          not: null,
        }
      }
      
      // Growth Metrics
      if (screen.minRevenueGrowth || screen.maxRevenueGrowth) {
        where.revenueGrowth = {
          gte: screen.minRevenueGrowth ? Number(screen.minRevenueGrowth) : undefined,
          lte: screen.maxRevenueGrowth ? Number(screen.maxRevenueGrowth) : undefined,
          not: null,
        }
      }
      
      if (screen.minEarningsGrowth || screen.maxEarningsGrowth) {
        where.earningsGrowth = {
          gte: screen.minEarningsGrowth ? Number(screen.minEarningsGrowth) : undefined,
          lte: screen.maxEarningsGrowth ? Number(screen.maxEarningsGrowth) : undefined,
          not: null,
        }
      }
      
      // Income Metrics
      if (screen.minDividendYield || screen.maxDividendYield) {
        where.dividendYield = {
          gte: screen.minDividendYield ? Number(screen.minDividendYield) : undefined,
          lte: screen.maxDividendYield ? Number(screen.maxDividendYield) : undefined,
          not: null,
        }
      }
      
      // Market Metrics
      if (screen.marketCapMin || screen.minMarketCap || screen.maxMarketCap) {
        where.marketCap = {
          gte: (screen.marketCapMin || screen.minMarketCap) ? Number(screen.marketCapMin || screen.minMarketCap) : undefined,
          lte: screen.maxMarketCap ? Number(screen.maxMarketCap) : undefined,
          not: null,
        }
      }
      
      if (screen.minVolume || screen.maxVolume) {
        where.volume = {
          gte: screen.minVolume ? BigInt(Math.floor(Number(screen.minVolume))) : undefined,
          lte: screen.maxVolume ? BigInt(Math.floor(Number(screen.maxVolume))) : undefined,
          not: null,
        }
      }
      
      if (screen.minMomentum || screen.momentumMin || screen.maxMomentum) {
        where.momentum3M = {
          gte: (screen.minMomentum || screen.momentumMin) ? Number(screen.minMomentum || screen.momentumMin) : undefined,
          lte: screen.maxMomentum ? Number(screen.maxMomentum) : undefined,
          not: null,
        }
      }
      
      console.log('Querying local database...')
      const startTime = Date.now()
      
      // Query local database - THIS IS INSTANT!
      const matchedStocks = await prisma.stockData.findMany({
        where,
        orderBy: [
          { dataQuality: 'desc' },
          { marketCap: 'desc' },
        ],
        take: 200, // Get top 200 matches
      })
      
      const queryTime = Date.now() - startTime
      console.log(`Query completed in ${queryTime}ms - found ${matchedStocks.length} stocks`)
      
      // Calculate composite O'Shaughnessy score for each stock
      const scoredStocks = matchedStocks.map(stock => {
        const peRatio = stock.peRatio ? Number(stock.peRatio) : null
        const psRatio = stock.psRatio ? Number(stock.psRatio) : null
        const pbRatio = stock.pbRatio ? Number(stock.pbRatio) : null
        const momentum = stock.momentum3M ? Number(stock.momentum3M) : 0
        
        // Score components (0-10 scale)
        const peScore = peRatio && peRatio > 0 ? Math.max(0, Math.min(10, 10 - peRatio / 3)) : 5
        const psScore = psRatio && psRatio > 0 ? Math.max(0, Math.min(10, 10 - psRatio * 3)) : 5
        const pbScore = pbRatio && pbRatio > 0 ? Math.max(0, Math.min(10, 10 - pbRatio / 2)) : 5
        const momentumScore = Math.max(0, Math.min(10, 5 + momentum / 4))
        
        const score = (peScore + psScore + pbScore + momentumScore) / 4
        
        return {
          ticker: stock.symbol,
          score,
          peRatio: peRatio || 0,
          psRatio: psRatio || 0,
          momentum,
          marketCap: stock.marketCap ? Number(stock.marketCap) : 0,
          currentPrice: stock.currentPrice ? Number(stock.currentPrice) : 0,
        }
      })
      
      // Sort by score and take top 50
      scoredStocks.sort((a, b) => b.score - a.score)
      const topStocks = scoredStocks.slice(0, 50)
      
      console.log(`Top stock: ${topStocks[0]?.ticker} (score: ${topStocks[0]?.score.toFixed(2)})`)

      // Clear existing watchlist items for this screen if we're doing a refresh
      if (specificScreenId) {
        await prisma.watchlistItem.deleteMany({
          where: { screenId: screen.id }
        })
        console.log(`Cleared existing watchlist items for screen: ${screen.name}`)
      }

      // Update watchlist
      for (const stock of topStocks) {
        await prisma.watchlistItem.upsert({
          where: {
            ticker_screenId: {
              ticker: stock.ticker,
              screenId: screen.id,
            },
          },
          update: {
            ...stock,
            lastNewsCheck: new Date(),
          },
          create: {
            ...stock,
            screenId: screen.id,
            lastNewsCheck: new Date(),
          },
        })
      }

      totalStocksFound += topStocks.length
      console.log(`Added ${topStocks.length} stocks to watchlist for screen: ${screen.name}\n`)
    }

    console.log('========================================')
    console.log('Screening completed successfully!')
    console.log(`Total stocks added across all screens: ${totalStocksFound}`)
    console.log('========================================')
    
    return { 
      message: 'Screening completed successfully', 
      screensProcessed: screens.length, 
      stocksFound: totalStocksFound 
    }
  }

  async analyzeNews(ticker: string) {
    try {
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      
      const newsItems = await finnhubClient.getCompanyNews(
        ticker,
        yesterday.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      )

      const sentiment = await finnhubClient.getNewsSentiment(ticker)
      
      return {
        newsCount: newsItems?.length || 0,
        sentimentScore: sentiment?.sentiment?.bearishPercent 
          ? (sentiment.sentiment.bullishPercent - sentiment.sentiment.bearishPercent) / 100
          : Math.random() - 0.5, // Fallback to random sentiment
        hasEarnings: newsItems?.some((item: any) => 
          item.headline?.toLowerCase().includes('earnings') ||
          item.headline?.toLowerCase().includes('results')
        ) || false,
      }
    } catch (error) {
      console.error(`Error analyzing news for ${ticker}:`, error)
      return { newsCount: 0, sentimentScore: 0, hasEarnings: false }
    }
  }

  /**
   * Helper: Update screen's current capital and save daily snapshot
   */
  async updateScreenCapital(screenId: string, capitalChange: number, reason: string) {
    const screen = await prisma.screen.findUnique({ where: { id: screenId } })
    if (!screen || !screen.allocatedCapital) return

    const currentCapital = Number(screen.currentCapital || screen.allocatedCapital)
    const newCapital = currentCapital + capitalChange

    // Parse existing daily history
    let dailyHistory: Array<{ date: string, capital: number, pnl: number }> = []
    if (screen.dailyCapitalHistory) {
      try {
        dailyHistory = JSON.parse(screen.dailyCapitalHistory)
      } catch (e) {
        dailyHistory = []
      }
    }

    // Add today's entry if not exists, or update if it does
    const today = new Date().toISOString().split('T')[0]
    const todayIndex = dailyHistory.findIndex(entry => entry.date === today)
    
    if (todayIndex >= 0) {
      dailyHistory[todayIndex] = {
        date: today,
        capital: newCapital,
        pnl: dailyHistory[todayIndex].pnl + capitalChange
      }
    } else {
      dailyHistory.push({
        date: today,
        capital: newCapital,
        pnl: capitalChange
      })
    }

    // Keep last 90 days only
    dailyHistory = dailyHistory.slice(-90)

    await prisma.screen.update({
      where: { id: screenId },
      data: {
        currentCapital: newCapital,
        dailyCapitalHistory: JSON.stringify(dailyHistory)
      }
    })

    console.log(`[Capital Tracking] Screen ${screen.name}: ${reason} | Change: $${capitalChange.toFixed(2)} | New Capital: $${newCapital.toFixed(2)}`)
  }

  async identifyTradingOpportunities(userId: string) {
    const account = await prisma.tradingAccount.findUnique({
      where: { userId },
    })

    if (!account) throw new Error('Trading account not found')

    // Get top watchlist items with recent news
    const watchlistItems = await prisma.watchlistItem.findMany({
      take: 20,
      orderBy: [
        { score: 'desc' },
        { dateAdded: 'desc' }
      ],
    })

    const opportunities = []

    for (const item of watchlistItems) {
      try {
        const newsAnalysis = await this.analyzeNews(item.ticker)
        
        // Update news data
        await prisma.watchlistItem.update({
          where: { id: item.id },
          data: {
            newsCount: newsAnalysis.newsCount,
            sentimentScore: newsAnalysis.sentimentScore,
            lastNewsCheck: new Date(),
          },
        })

        const itemScore = Number(item.score)
        
        // Identify opportunities based on:
        // 1. High score (> 7.0)
        // 2. Positive sentiment (> 0.3)
        // 3. Recent news activity (> 2 articles)
        // 4. Earnings catalyst
        if (
          itemScore > 7.0 &&
          newsAnalysis.sentimentScore > 0.3 &&
          (newsAnalysis.newsCount > 2 || newsAnalysis.hasEarnings)
        ) {
          opportunities.push({
            ...item,
            score: itemScore,
            newsCount: newsAnalysis.newsCount,
            sentimentScore: newsAnalysis.sentimentScore,
            hasEarnings: newsAnalysis.hasEarnings,
            opportunityScore: itemScore + newsAnalysis.sentimentScore * 2,
          })
        }
      } catch (error) {
        console.error(`Error analyzing opportunity for ${item.ticker}:`, error)
      }
    }

    // Sort by opportunity score and return top 5
    opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore)
    return opportunities.slice(0, Math.min(5, account.maxPositions))
  }

  async identifyEarningsOpportunities(screenId: string, userId: string) {
    const account = await prisma.tradingAccount.findUnique({
      where: { userId },
    })

    if (!account) throw new Error('Trading account not found')

    // Get the earnings screen configuration with watchlist items
    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
      include: {
        watchlistItems: {
          select: { ticker: true }
        }
      }
    })

    if (!screen || screen.screenType !== 'EARNINGS') {
      throw new Error('Invalid earnings screen')
    }

    // Get monitored symbols from watchlistItems (not from monitoredSymbols field)
    const monitoredSymbols = screen.watchlistItems.map(item => item.ticker)
    
    if (monitoredSymbols.length === 0) {
      console.log(`⚠️  No watchlist items found for screen ${screen.name}`)
      return []
    }

    console.log(`📊 Checking earnings for ${monitoredSymbols.length} monitored stocks: ${monitoredSymbols.join(', ')}`)

    // Get today's earnings reports
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    const earningsQuery: any = {
      symbol: { in: monitoredSymbols }, // Only check monitored symbols
      earningsDate: {
        gte: new Date(todayStr),
        lt: new Date(new Date(todayStr).getTime() + 24 * 60 * 60 * 1000)
      },
      beat: true, // Only stocks that beat estimates
      surprise: {
        gte: Number(screen.minEarningsSurprise || 5.0)
      }
    }
    
    const earningsReports = await prisma.earningsCalendar.findMany({
      where: earningsQuery
    })

    const opportunities = []

    console.log(`✅ Found ${earningsReports.length} earnings reports that beat expectations by ≥${screen.minEarningsSurprise}%`)

    // For EARNINGS screens, we don't apply O'Shaughnessy filters
    // We only care about the earnings surprise threshold (already filtered in query)
    for (const report of earningsReports) {
      try {
        // Get stock fundamental data (for price only)
        const stockData = await prisma.stockData.findUnique({
          where: { symbol: report.symbol }
        })

        if (!stockData) {
          console.log(`⚠️  ${report.symbol}: No stock data in database - skipping`)
          continue
        }

        if (stockData.hasError) {
          console.log(`⚠️  ${report.symbol}: Stock data has errors - skipping`)
          continue
        }

        if (!stockData.currentPrice) {
          console.log(`⚠️  ${report.symbol}: No current price available - skipping`)
          continue
        }

        // Calculate opportunity score based on surprise %
        const opportunityScore = Number(report.surprise || 0)

        console.log(`\u2705 ${report.symbol}: Qualified earnings beat - surprise ${report.surprise?.toFixed(1)}%, price $${Number(stockData.currentPrice).toFixed(2)}`)

        opportunities.push({
          ticker: report.symbol,
          companyName: stockData.companyName,
          currentPrice: Number(stockData.currentPrice),
          surprise: Number(report.surprise),
          actualEPS: Number(report.actualEPS),
          estimatedEPS: Number(report.estimatedEPS),
          opportunityScore,
          reason: `Earnings beat by ${report.surprise?.toFixed(1)}%`,
        })
      } catch (error) {
        console.error(`\u274c Error analyzing earnings opportunity for ${report.symbol}:`, error)
      }
    }

    // Sort by surprise % (bigger beats = higher priority)
    opportunities.sort((a, b) => b.surprise - a.surprise)
    
    // Use screen-specific maxPositions (default 10, range 5-15) or account maxPositions, whichever is smaller
    const screenMaxPositions = screen.maxPositions || 10 // Default to 10 if not set
    const effectiveMaxPositions = Math.min(screenMaxPositions, account.maxPositions)
    const topOpportunities = opportunities.slice(0, effectiveMaxPositions)
    
    console.log(`\n📊 Max Positions Config: Screen limit = ${screenMaxPositions}, Account limit = ${account.maxPositions}, Effective = ${effectiveMaxPositions}`)
    console.log(`🎯 Top opportunities to trade: ${topOpportunities.length} (from ${opportunities.length} qualified)`)
    
    // Execute trades for earnings opportunities if automation is enabled
    if (!account.automationEnabled) {
      console.log(`⚠️  Automation is disabled - skipping trade execution`)
      return topOpportunities
    }
    
    console.log(`✅ Automation enabled - executing trades...`)
    
    // Calculate available capital
    let availableCapital = Number(account.startingCapital)
    
    // Check if this is a screen with allocated capital
    if (screen.allocatedCapital && Number(screen.allocatedCapital) > 0) {
      availableCapital = Number(screen.currentCapital || screen.allocatedCapital)
      console.log(`💰 Using screen capital: $${availableCapital.toFixed(2)}`)
    }
    
    // DYNAMIC POSITION SIZING: Calculate position size based on ACTUAL opportunities found
    // This ensures full capital deployment even if fewer opportunities are available
    const positionSize = topOpportunities.length > 0 
      ? availableCapital / topOpportunities.length 
      : availableCapital / Number(account.maxPositions)
    
    console.log(`📊 Dynamic Position Sizing: $${availableCapital.toFixed(2)} ÷ ${topOpportunities.length} opportunities = $${positionSize.toFixed(2)} per position`)
    
    // Execute trades for each opportunity
    const executedTrades = []
    for (const opp of topOpportunities) {
      try {
        console.log(`\n💼 Executing BUY for ${opp.ticker} @ $${opp.currentPrice.toFixed(2)}`)
        
        const quantity = Math.floor(positionSize / opp.currentPrice)
        
        if (quantity <= 0) {
          console.log(`   ⚠️  Insufficient capital for ${opp.ticker} - skipping`)
          continue
        }
        
        console.log(`   Quantity: ${quantity} shares ($${(quantity * opp.currentPrice).toFixed(2)})`)
        
        // Note: Actual Alpaca order execution would go here if alpacaClient is configured
        // For now, we'll just record the trade in the database
        
        // Find or create watchlist item for this stock
        let watchlistItem = await prisma.watchlistItem.findFirst({
          where: {
            ticker: opp.ticker,
            screenId: screen.id
          }
        })
        
        if (!watchlistItem) {
          console.log(`   ℹ️  Creating watchlist item for ${opp.ticker}`)
          watchlistItem = await prisma.watchlistItem.create({
            data: {
              ticker: opp.ticker,
              screenId: screen.id,
              score: opp.opportunityScore,
              dateAdded: new Date()
            }
          })
        }
        
        // Create position record
        const position = await prisma.position.create({
          data: {
            userId,
            ticker: opp.ticker,
            watchlistItemId: watchlistItem.id,
            quantity,
            entryPrice: opp.currentPrice,
            currentPrice: opp.currentPrice,
            unrealizedPnl: 0,
            trailingStopPrice: opp.currentPrice * (1 - Number(account.trailingStopPct) / 100),
            entryTime: new Date(),
            status: 'OPEN',
            alpacaOrderId: `SIM-${Date.now()}-${opp.ticker}` // Simulated order ID
          }
        })
        
        // Create trade record (trades are always BUY to start, exitPrice null = still open)
        await prisma.trade.create({
          data: {
            userId,
            ticker: opp.ticker,
            watchlistItemId: watchlistItem.id,
            quantity,
            entryPrice: opp.currentPrice,
            entryTime: new Date(),
            alpacaEntryOrderId: `SIM-${Date.now()}-${opp.ticker}`,
            strategy: `EARNINGS_BEAT_${screen.name}`
          }
        })
        
        // Update screen capital if applicable
        if (screen.allocatedCapital && Number(screen.allocatedCapital) > 0) {
          const positionCost = quantity * opp.currentPrice
          await this.updateScreenCapital(
            screen.id,
            -positionCost,
            `BUY ${opp.ticker} x${quantity} @ $${opp.currentPrice.toFixed(2)} (Earnings beat +${opp.surprise.toFixed(1)}%)`
          )
        }
        
        console.log(`   ✅ Trade executed: BUY ${quantity} ${opp.ticker} @ $${opp.currentPrice.toFixed(2)}`)
        
        // Send notification
        try {
          await notificationService.sendTradeNotification({
            userId,
            ticker: opp.ticker,
            action: 'BUY',
            quantity,
            price: opp.currentPrice,
            reason: opp.reason
          })
        } catch (notifError) {
          console.error(`   ⚠️  Failed to send notification:`, notifError)
        }
        
        executedTrades.push({
          ...opp,
          quantity,
          positionId: position.id
        })
        
      } catch (error: any) {
        console.error(`   ❌ Error executing trade for ${opp.ticker}:`, error.message)
      }
    }
    
    console.log(`\n✅ Executed ${executedTrades.length} trades`)
    return executedTrades
  }

  private passesScreenCriteria(stockData: any, screen: any): boolean {
    // Check all O'Shaughnessy criteria
    
    // Valuation
    if (screen.minPE !== null && screen.minPE !== undefined) {
      if (stockData.peRatio === null || Number(stockData.peRatio) < Number(screen.minPE)) return false
    }
    if (screen.maxPE !== null && screen.maxPE !== undefined) {
      if (stockData.peRatio === null || Number(stockData.peRatio) > Number(screen.maxPE)) return false
    }
    if (screen.minPS !== null && screen.minPS !== undefined) {
      if (stockData.psRatio === null || Number(stockData.psRatio) < Number(screen.minPS)) return false
    }
    if (screen.maxPS !== null && screen.maxPS !== undefined) {
      if (stockData.psRatio === null || Number(stockData.psRatio) > Number(screen.maxPS)) return false
    }
    if (screen.minPB !== null && screen.minPB !== undefined) {
      if (stockData.pbRatio === null || Number(stockData.pbRatio) < Number(screen.minPB)) return false
    }
    if (screen.maxPB !== null && screen.maxPB !== undefined) {
      if (stockData.pbRatio === null || Number(stockData.pbRatio) > Number(screen.maxPB)) return false
    }
    if (screen.minPCF !== null && screen.minPCF !== undefined) {
      if (stockData.pcfRatio === null || Number(stockData.pcfRatio) < Number(screen.minPCF)) return false
    }
    if (screen.maxPCF !== null && screen.maxPCF !== undefined) {
      if (stockData.pcfRatio === null || Number(stockData.pcfRatio) > Number(screen.maxPCF)) return false
    }

    // Financial Health
    if (screen.minROE !== null && screen.minROE !== undefined) {
      if (stockData.roe === null || Number(stockData.roe) < Number(screen.minROE)) return false
    }
    if (screen.maxROE !== null && screen.maxROE !== undefined) {
      if (stockData.roe === null || Number(stockData.roe) > Number(screen.maxROE)) return false
    }
    if (screen.minDebtToEquity !== null && screen.minDebtToEquity !== undefined) {
      if (stockData.debtToEquity === null || Number(stockData.debtToEquity) < Number(screen.minDebtToEquity)) return false
    }
    if (screen.maxDebtToEquity !== null && screen.maxDebtToEquity !== undefined) {
      if (stockData.debtToEquity === null || Number(stockData.debtToEquity) > Number(screen.maxDebtToEquity)) return false
    }
    if (screen.minCurrentRatio !== null && screen.minCurrentRatio !== undefined) {
      if (stockData.currentRatio === null || Number(stockData.currentRatio) < Number(screen.minCurrentRatio)) return false
    }
    if (screen.maxCurrentRatio !== null && screen.maxCurrentRatio !== undefined) {
      if (stockData.currentRatio === null || Number(stockData.currentRatio) > Number(screen.maxCurrentRatio)) return false
    }

    // Growth
    if (screen.minRevenueGrowth !== null && screen.minRevenueGrowth !== undefined) {
      if (stockData.revenueGrowth === null || Number(stockData.revenueGrowth) < Number(screen.minRevenueGrowth)) return false
    }
    if (screen.maxRevenueGrowth !== null && screen.maxRevenueGrowth !== undefined) {
      if (stockData.revenueGrowth === null || Number(stockData.revenueGrowth) > Number(screen.maxRevenueGrowth)) return false
    }
    if (screen.minEarningsGrowth !== null && screen.minEarningsGrowth !== undefined) {
      if (stockData.earningsGrowth === null || Number(stockData.earningsGrowth) < Number(screen.minEarningsGrowth)) return false
    }
    if (screen.maxEarningsGrowth !== null && screen.maxEarningsGrowth !== undefined) {
      if (stockData.earningsGrowth === null || Number(stockData.earningsGrowth) > Number(screen.maxEarningsGrowth)) return false
    }

    // Income
    if (screen.minDividendYield !== null && screen.minDividendYield !== undefined) {
      if (stockData.dividendYield === null || Number(stockData.dividendYield) < Number(screen.minDividendYield)) return false
    }
    if (screen.maxDividendYield !== null && screen.maxDividendYield !== undefined) {
      if (stockData.dividendYield === null || Number(stockData.dividendYield) > Number(screen.maxDividendYield)) return false
    }

    // Market
    if (screen.minMarketCap !== null && screen.minMarketCap !== undefined) {
      if (stockData.marketCap === null || Number(stockData.marketCap) < Number(screen.minMarketCap)) return false
    }
    if (screen.maxMarketCap !== null && screen.maxMarketCap !== undefined) {
      if (stockData.marketCap === null || Number(stockData.marketCap) > Number(screen.maxMarketCap)) return false
    }
    if (screen.minVolume !== null && screen.minVolume !== undefined) {
      if (stockData.volume === null || Number(stockData.volume) < Number(screen.minVolume)) return false
    }
    if (screen.maxVolume !== null && screen.maxVolume !== undefined) {
      if (stockData.volume === null || Number(stockData.volume) > Number(screen.maxVolume)) return false
    }
    if (screen.minMomentum !== null && screen.minMomentum !== undefined) {
      if (stockData.momentum === null || Number(stockData.momentum) < Number(screen.minMomentum)) return false
    }
    if (screen.maxMomentum !== null && screen.maxMomentum !== undefined) {
      if (stockData.momentum === null || Number(stockData.momentum) > Number(screen.maxMomentum)) return false
    }

    return true
  }

  async executeTrades(userId: string, opportunities: any[]) {
    if (!this.alpacaClient) {
      await this.initializeAlpaca(userId)
    }

    const account = await prisma.tradingAccount.findUnique({
      where: { userId },
    })

    if (!account || !account.automationEnabled) {
      console.log('Automated trading is disabled')
      return []
    }

    // Check current positions
    const currentPositions = await prisma.position.count({
      where: {
        userId,
        status: 'OPEN',
      },
    })

    const availableSlots = account.maxPositions - currentPositions
    if (availableSlots <= 0) {
      console.log('No available position slots')
      return []
    }

    const positionSize = Number(account.currentValue) / account.maxPositions
    const executedTrades = []

    for (let i = 0; i < Math.min(opportunities.length, availableSlots); i++) {
      const opportunity = opportunities[i]
      
      try {
        // Get screen info to check for allocated capital
        const watchlistItem = await prisma.watchlistItem.findUnique({
          where: { id: opportunity.id },
          include: { screen: true }
        })

        // Get current price
        const quote = await finnhubClient.getQuote(opportunity.ticker)
        if (!quote?.c) continue

        const currentPrice = quote.c
        let quantity: number

        // Use screen-specific capital if allocated, otherwise use account capital
        const screenAllocatedCapital = watchlistItem?.screen?.allocatedCapital ? Number(watchlistItem.screen.allocatedCapital) : 0
        if (screenAllocatedCapital > 0 && watchlistItem?.screen) {
          const screen = watchlistItem.screen
          const currentCapital = Number(screen.currentCapital || screen.allocatedCapital)
          const maxPositions = account.maxPositions // or could be screen-specific
          
          // Calculate position size from screen's current capital
          const screenPositionSize = currentCapital / maxPositions
          quantity = Math.floor(screenPositionSize / currentPrice)
          
          console.log(`[Capital Tracking] Screen ${screen.name}: Using allocated capital $${currentCapital.toFixed(2)} for ${opportunity.ticker}`)
        } else {
          quantity = Math.floor(positionSize / currentPrice)
        }
        
        if (quantity < 1) continue

        const positionCost = currentPrice * quantity

        // Deduct from screen capital if applicable
        if (screenAllocatedCapital > 0 && watchlistItem?.screenId) {
          await this.updateScreenCapital(
            watchlistItem.screenId,
            -positionCost,
            `BUY ${opportunity.ticker} x${quantity} @ $${currentPrice.toFixed(2)}`
          )
        }

        // Place market buy order with Alpaca
        const order = await this.alpacaClient!.createOrder({
          symbol: opportunity.ticker,
          qty: quantity,
          side: 'buy',
          type: 'market',
          time_in_force: 'day',
        })

        // Create trailing stop order
        const stopOrder = await this.alpacaClient!.createOrder({
          symbol: opportunity.ticker,
          qty: quantity,
          side: 'sell',
          type: 'trailing_stop',
          time_in_force: 'gtc',
          trail_percent: Number(account.trailingStopPct),
        })

        // Record position in database
        const position = await prisma.position.create({
          data: {
            userId,
            ticker: opportunity.ticker,
            watchlistItemId: opportunity.id,
            quantity,
            entryPrice: currentPrice,
            currentPrice,
            unrealizedPnl: 0,
            trailingStopPrice: currentPrice * (1 - Number(account.trailingStopPct) / 100),
            alpacaOrderId: order.id,
            entryTime: new Date(),
            status: 'OPEN',
          },
        })

        // Record trade
        await prisma.trade.create({
          data: {
            userId,
            ticker: opportunity.ticker,
            watchlistItemId: opportunity.id,
            quantity,
            entryPrice: currentPrice,
            entryTime: new Date(),
            alpacaEntryOrderId: order.id,
            strategy: 'O\'Shaughnessy Auto',
          },
        })

        executedTrades.push({
          ticker: opportunity.ticker,
          quantity,
          entryPrice: currentPrice,
          orderId: order.id,
        })

        console.log(`Executed trade: ${opportunity.ticker} x${quantity} @ $${currentPrice}`)

        // Send trade notification
        await notificationService.sendTradeNotification({
          userId,
          ticker: opportunity.ticker,
          action: 'BUY',
          quantity,
          price: currentPrice,
          reason: 'New trading opportunity identified'
        }).catch(err => console.error('Failed to send trade notification:', err))

      } catch (error) {
        console.error(`Error executing trade for ${opportunity.ticker}:`, error)
      }
    }

    return executedTrades
  }

  async monitorPositions(userId: string) {
    if (!this.alpacaClient) {
      await this.initializeAlpaca(userId)
    }

    const positions = await prisma.position.findMany({
      where: {
        userId,
        status: 'OPEN',
      },
    })

    for (const position of positions) {
      try {
        // Get current price
        const quote = await finnhubClient.getQuote(position.ticker)
        if (!quote?.c) continue

        const currentPrice = quote.c
        const unrealizedPnl = (currentPrice - Number(position.entryPrice)) * position.quantity
        
        // Update position with current price
        await prisma.position.update({
          where: { id: position.id },
          data: {
            currentPrice,
            unrealizedPnl,
          },
        })

        // Check for sell signals
        const shouldSell = await this.checkSellSignals(position, currentPrice)
        
        if (shouldSell.sell) {
          await this.sellPosition(position.id, shouldSell.reason || 'MANUAL')
        }

      } catch (error) {
        console.error(`Error monitoring position ${position.ticker}:`, error)
      }
    }
  }

  async checkSellSignals(position: any, currentPrice: number) {
    const account = await prisma.tradingAccount.findUnique({
      where: { userId: position.userId },
    })

    if (!account) return { sell: false }

    // Check time cutoff
    const now = new Date()
    const cutoffTime = new Date()
    cutoffTime.setHours(account.timeCutoffHour, account.timeCutoffMin, 0, 0)
    
    if (now >= cutoffTime) {
      return { sell: true, reason: 'TIME_CUTOFF' }
    }

    // Check for negative news
    const newsAnalysis = await this.analyzeNews(position.ticker)
    if (newsAnalysis.sentimentScore < -0.5) {
      return { sell: true, reason: 'NEGATIVE_NEWS' }
    }

    // Trailing stop is handled by Alpaca automatically
    return { sell: false }
  }

  async sellPosition(positionId: string, reason: string) {
    try {
      const position = await prisma.position.findUnique({
        where: { id: positionId },
        include: {
          watchlistItem: {
            include: { screen: true }
          }
        }
      })

      if (!position || position.status !== 'OPEN') return

      if (!this.alpacaClient) {
        await this.initializeAlpaca(position.userId)
      }

      // Place market sell order
      const sellOrder = await this.alpacaClient!.createOrder({
        symbol: position.ticker,
        qty: position.quantity,
        side: 'sell',
        type: 'market',
        time_in_force: 'day',
      })

      const exitPrice = Number(position.currentPrice)
      const realizedPnl = (exitPrice - Number(position.entryPrice)) * position.quantity
      const saleProceeds = exitPrice * position.quantity

      // Add capital back to screen if applicable (original cost + P&L)
      const positionScreenAllocatedCapital = position.watchlistItem?.screen?.allocatedCapital ? Number(position.watchlistItem.screen.allocatedCapital) : 0
      if (positionScreenAllocatedCapital > 0 && position.watchlistItem?.screenId) {
        await this.updateScreenCapital(
          position.watchlistItem.screenId,
          saleProceeds,
          `SELL ${position.ticker} x${position.quantity} @ $${exitPrice.toFixed(2)} | P&L: $${realizedPnl.toFixed(2)}`
        )
      }

      // Update position
      await prisma.position.update({
        where: { id: positionId },
        data: {
          status: 'CLOSED',
        },
      })

      // Update trade record
      const trade = await prisma.trade.findFirst({
        where: {
          ticker: position.ticker,
          userId: position.userId,
          exitTime: null,
        },
      })

      if (trade) {
        await prisma.trade.update({
          where: { id: trade.id },
          data: {
            exitPrice,
            exitTime: new Date(),
            realizedPnl,
            exitReason: reason as any,
            alpacaExitOrderId: sellOrder.id,
            holdTimeMinutes: Math.floor(
              (Date.now() - new Date(position.entryTime).getTime()) / (1000 * 60)
            ),
          },
        })
      }

      console.log(`Sold position: ${position.ticker} @ $${exitPrice} (${reason})`)

      // Send trade notification
      await notificationService.sendTradeNotification({
        userId: position.userId,
        ticker: position.ticker,
        action: 'SELL',
        quantity: position.quantity,
        price: exitPrice,
        pnl: realizedPnl,
        entryPrice: Number(position.entryPrice),
        reason
      }).catch(err => console.error('Failed to send trade notification:', err))

    } catch (error) {
      console.error(`Error selling position ${positionId}:`, error)
    }
  }

  async runBacktest(params: {
    screenId: string
    startDate: string
    endDate: string
    initialCapital: number
    maxPositions: number
    trailingStopPct: number
  }) {
    console.log('Starting backtest...')
    console.log('Parameters:', params)

    // Fetch the screen configuration
    const screen = await prisma.screen.findUnique({
      where: { id: params.screenId }
    })

    if (!screen) {
      throw new Error('Screen not found')
    }

    const start = new Date(params.startDate)
    const end = new Date(params.endDate)
    
    // Backtest state
    let capital = params.initialCapital
    let portfolioValue = params.initialCapital
    const positions: Map<string, any> = new Map()
    const trades: any[] = []
    const dailyValues: any[] = []
    
    let totalWins = 0
    let totalLosses = 0
    let totalGain = 0
    let totalLoss = 0
    let peakValue = params.initialCapital
    let maxDrawdown = 0

    // Iterate through each trading day
    const currentDate = new Date(start)
    let tradingDaysProcessed = 0

    while (currentDate <= end) {
      // Skip weekends
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      const dateStr = currentDate.toISOString().split('T')[0]
      tradingDaysProcessed++

      // Get stocks that match the screen criteria for this day
      const snapshots = await this.getScreenedStocksForDate(screen, dateStr)
      
      // Update existing positions
      for (const [ticker, position] of positions.entries()) {
        const snapshot = snapshots.find(s => s.symbol === ticker)
        
        if (snapshot) {
          const currentPrice = Number(snapshot.currentPrice)
          position.currentPrice = currentPrice
          position.unrealizedPnl = (currentPrice - position.entryPrice) * position.quantity
          position.daysHeld++

          // Update trailing stop
          if (currentPrice > position.highWaterMark) {
            position.highWaterMark = currentPrice
            position.trailingStop = currentPrice * (1 - params.trailingStopPct / 100)
          }

          // Check exit conditions
          let shouldExit = false
          let exitReason = ''

          // Trailing stop hit
          if (currentPrice <= position.trailingStop) {
            shouldExit = true
            exitReason = 'TRAILING_STOP'
          }

          // Negative momentum (simulate negative news)
          if (Number(snapshot.momentum3M) < -10) {
            shouldExit = true
            exitReason = 'NEGATIVE_MOMENTUM'
          }

          // Time-based exit (after 5 days)
          if (position.daysHeld >= 5) {
            shouldExit = true
            exitReason = 'TIME_CUTOFF'
          }

          if (shouldExit) {
            const exitPrice = currentPrice
            const pnl = (exitPrice - position.entryPrice) * position.quantity
            const pnlPct = ((exitPrice - position.entryPrice) / position.entryPrice) * 100

            trades.push({
              ticker: position.ticker,
              entryDate: position.entryDate,
              exitDate: dateStr,
              entryPrice: position.entryPrice,
              exitPrice: exitPrice,
              quantity: position.quantity,
              pnl: pnl,
              pnlPct: pnlPct,
              daysHeld: position.daysHeld,
              exitReason: exitReason,
              result: pnl > 0 ? 'win' : 'loss'
            })

            capital += position.entryPrice * position.quantity + pnl

            if (pnl > 0) {
              totalWins++
              totalGain += pnl
            } else {
              totalLosses++
              totalLoss += Math.abs(pnl)
            }

            positions.delete(ticker)
          }
        }
      }

      // Calculate current portfolio value
      let positionsValue = 0
      for (const position of positions.values()) {
        positionsValue += position.currentPrice * position.quantity
      }
      portfolioValue = capital + positionsValue

      // Track peak and drawdown
      if (portfolioValue > peakValue) {
        peakValue = portfolioValue
      }
      const currentDrawdown = ((peakValue - portfolioValue) / peakValue) * 100
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown
      }

      dailyValues.push({
        date: dateStr,
        value: portfolioValue,
        cash: capital,
        positionsValue: positionsValue,
        openPositions: positions.size
      })

      // Look for new opportunities (only if we have available slots)
      if (positions.size < params.maxPositions && snapshots.length > 0) {
        // Filter for stocks with positive momentum and good scores (simulating news catalyst)
        const opportunities = snapshots
          .filter(s => {
            // Must have positive 3M momentum (simulating positive news)
            const momentum = Number(s.momentum3M)
            return momentum > 5 && !positions.has(s.symbol)
          })
          .slice(0, params.maxPositions - positions.size)

        for (const opp of opportunities) {
          const entryPrice = Number(opp.currentPrice)
          const positionSize = capital / params.maxPositions
          const quantity = Math.floor(positionSize / entryPrice)

          if (quantity >= 1 && capital >= entryPrice * quantity) {
            capital -= entryPrice * quantity

            positions.set(opp.symbol, {
              ticker: opp.symbol,
              entryDate: dateStr,
              entryPrice: entryPrice,
              currentPrice: entryPrice,
              quantity: quantity,
              highWaterMark: entryPrice,
              trailingStop: entryPrice * (1 - params.trailingStopPct / 100),
              unrealizedPnl: 0,
              daysHeld: 0
            })
          }
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Close any remaining positions at end date
    for (const [ticker, position] of positions.entries()) {
      const exitPrice = position.currentPrice
      const pnl = (exitPrice - position.entryPrice) * position.quantity
      const pnlPct = ((exitPrice - position.entryPrice) / position.entryPrice) * 100

      trades.push({
        ticker: position.ticker,
        entryDate: position.entryDate,
        exitDate: end.toISOString().split('T')[0],
        entryPrice: position.entryPrice,
        exitPrice: exitPrice,
        quantity: position.quantity,
        pnl: pnl,
        pnlPct: pnlPct,
        daysHeld: position.daysHeld,
        exitReason: 'BACKTEST_END',
        result: pnl > 0 ? 'win' : 'loss'
      })

      if (pnl > 0) {
        totalWins++
        totalGain += pnl
      } else {
        totalLosses++
        totalLoss += Math.abs(pnl)
      }
    }

    // Calculate final metrics
    const totalReturn = portfolioValue - params.initialCapital
    const totalReturnPct = (totalReturn / params.initialCapital) * 100
    const totalTrades = trades.length
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0
    const avgGain = totalWins > 0 ? (totalGain / totalWins / params.initialCapital) * 100 : 0
    const avgLoss = totalLosses > 0 ? (totalLoss / totalLosses / params.initialCapital) * 100 : 0
    const profitFactor = totalLoss > 0 ? totalGain / totalLoss : totalGain > 0 ? 999 : 0
    
    // Calculate Sharpe Ratio (simplified)
    const returns = dailyValues.map((d, i) => {
      if (i === 0) return 0
      return (d.value - dailyValues[i-1].value) / dailyValues[i-1].value
    })
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0

    // Average hold time
    const avgHoldTime = totalTrades > 0 ? trades.reduce((sum, t) => sum + t.daysHeld, 0) / totalTrades : 0

    // Best and worst trades
    const bestTrade = trades.length > 0 ? Math.max(...trades.map(t => t.pnlPct)) : 0
    const worstTrade = trades.length > 0 ? Math.min(...trades.map(t => t.pnlPct)) : 0

    console.log(`Backtest complete: ${totalTrades} trades, ${totalReturnPct.toFixed(2)}% return`)

    return {
      totalReturn: totalReturn,
      totalReturnPct: totalReturnPct,
      finalValue: portfolioValue,
      winRate: winRate,
      totalTrades: totalTrades,
      winningTrades: totalWins,
      losingTrades: totalLosses,
      avgGain: avgGain,
      avgLoss: avgLoss,
      bestTrade: bestTrade,
      worstTrade: worstTrade,
      maxDrawdown: maxDrawdown,
      sharpeRatio: sharpeRatio,
      avgHoldTime: avgHoldTime,
      profitFactor: profitFactor,
      tradingDaysProcessed: tradingDaysProcessed,
      trades: trades.slice(-20).reverse(), // Return last 20 trades
      dailyValues: dailyValues,
      parameters: params
    }
  }

  private async getScreenedStocksForDate(screen: any, dateStr: string): Promise<any[]> {
    // Build WHERE clause based on screen criteria
    const where: any = {
      snapshotDate: new Date(dateStr),
      hasError: false,
      dataQuality: { gte: 30 }
    }

    // Valuation Metrics
    if (screen.minPE || screen.maxPE || screen.peRatioMax) {
      where.peRatio = {
        gte: screen.minPE ? Number(screen.minPE) : undefined,
        lte: (screen.maxPE || screen.peRatioMax) ? Number(screen.maxPE || screen.peRatioMax) : undefined,
        not: null,
      }
    }

    if (screen.minPS || screen.maxPS || screen.psRatioMax) {
      where.psRatio = {
        gte: screen.minPS ? Number(screen.minPS) : undefined,
        lte: (screen.maxPS || screen.psRatioMax) ? Number(screen.maxPS || screen.psRatioMax) : undefined,
        not: null,
      }
    }

    if (screen.minPB || screen.maxPB) {
      where.pbRatio = {
        gte: screen.minPB ? Number(screen.minPB) : undefined,
        lte: screen.maxPB ? Number(screen.maxPB) : undefined,
        not: null,
      }
    }

    // Financial Health
    if (screen.minROE || screen.maxROE) {
      where.roe = {
        gte: screen.minROE ? Number(screen.minROE) : undefined,
        lte: screen.maxROE ? Number(screen.maxROE) : undefined,
        not: null,
      }
    }

    if (screen.minDebtToEquity || screen.maxDebtToEquity) {
      where.debtToEquity = {
        gte: screen.minDebtToEquity ? Number(screen.minDebtToEquity) : undefined,
        lte: screen.maxDebtToEquity ? Number(screen.maxDebtToEquity) : undefined,
        not: null,
      }
    }

    // Market Cap
    if (screen.minMarketCap) {
      where.marketCap = {
        ...where.marketCap,
        gte: Number(screen.minMarketCap) * 1000000
      }
    }

    // Momentum
    if (screen.minMomentum3M) {
      where.momentum3M = {
        gte: Number(screen.minMomentum3M),
        not: null,
      }
    }

    // Query snapshots for this date
    const snapshots = await prisma.stockDataSnapshot.findMany({
      where: where,
      take: 50,
      orderBy: [
        { momentum3M: 'desc' }
      ]
    })

    return snapshots
  }

  async runPaperTradingBacktest(runId: string) {
    console.log(`Starting paper trading backtest for run ${runId}...`)

    // Fetch the run configuration
    const run = await prisma.paperTradingRun.findUnique({
      where: { id: runId },
      include: { screen: true }
    })

    if (!run) {
      throw new Error('Paper trading run not found')
    }

    if (!run.screen) {
      throw new Error('Paper trading run must have a screen associated')
    }

    const start = new Date(run.startDate)
    const end = run.endDate ? new Date(run.endDate) : new Date()
    
    // Backtest state
    let capital = run.startingCapital.toNumber()
    let portfolioValue = run.startingCapital.toNumber()
    const positions: Map<string, any> = new Map()
    const trades: any[] = []
    
    let totalWins = 0
    let totalLosses = 0
    let totalGain = 0
    let totalLoss = 0
    let peakValue = run.startingCapital.toNumber()
    let maxDrawdown = 0

    // Iterate through each trading day
    const currentDate = new Date(start)

    while (currentDate <= end) {
      // Skip weekends
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      const dateStr = currentDate.toISOString().split('T')[0]

      // Get stocks that match the screen criteria for this day
      const snapshots = await this.getScreenedStocksForDate(run.screen, dateStr)
      
      // Update existing positions
      for (const [ticker, position] of positions.entries()) {
        const snapshot = snapshots.find(s => s.symbol === ticker)
        
        if (snapshot) {
          const currentPrice = Number(snapshot.currentPrice)
          position.currentPrice = currentPrice
          position.unrealizedPnl = (currentPrice - position.entryPrice) * position.quantity
          position.daysHeld++

          // Update trailing stop
          if (currentPrice > position.highWaterMark) {
            position.highWaterMark = currentPrice
            position.trailingStop = currentPrice * (1 - run.trailingStopPct.toNumber() / 100)
          }

          // Check exit conditions
          let shouldExit = false
          let exitReason: any = 'STOP_LOSS'

          // Trailing stop hit
          if (currentPrice <= position.trailingStop) {
            shouldExit = true
            exitReason = 'STOP_LOSS'
          }

          // Negative momentum (simulate negative news)
          if (Number(snapshot.momentum3M) < -10) {
            shouldExit = true
            exitReason = 'NEGATIVE_NEWS'
          }

          // Time-based exit (after 5 days)
          if (position.daysHeld >= 5) {
            shouldExit = true
            exitReason = 'TIME_CUTOFF'
          }

          if (shouldExit) {
            const exitPrice = currentPrice
            const pnl = (exitPrice - position.entryPrice) * position.quantity
            const holdTimeMinutes = position.daysHeld * 24 * 60

            trades.push({
              ticker: position.ticker,
              entryDate: position.entryDate,
              exitDate: dateStr,
              entryPrice: position.entryPrice,
              exitPrice: exitPrice,
              quantity: position.quantity,
              pnl: pnl,
              holdTimeMinutes: holdTimeMinutes,
              exitReason: exitReason
            })

            capital += position.entryPrice * position.quantity + pnl

            if (pnl > 0) {
              totalWins++
              totalGain += pnl
            } else {
              totalLosses++
              totalLoss += Math.abs(pnl)
            }

            positions.delete(ticker)
          }
        }
      }

      // Calculate current portfolio value
      let positionsValue = 0
      for (const position of positions.values()) {
        positionsValue += position.currentPrice * position.quantity
      }
      portfolioValue = capital + positionsValue

      // Track peak and drawdown
      if (portfolioValue > peakValue) {
        peakValue = portfolioValue
      }
      const currentDrawdown = ((peakValue - portfolioValue) / peakValue) * 100
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown
      }

      // Look for new opportunities (only if we have available slots)
      if (positions.size < run.maxPositions && snapshots.length > 0) {
        // Filter for stocks with positive momentum and good scores (simulating news catalyst)
        const opportunities = snapshots
          .filter(s => {
            // Must have positive 3M momentum (simulating positive news)
            const momentum = Number(s.momentum3M)
            return momentum > 5 && !positions.has(s.symbol)
          })
          .slice(0, run.maxPositions - positions.size)

        for (const opp of opportunities) {
          const entryPrice = Number(opp.currentPrice)
          const positionSize = capital / run.maxPositions
          const quantity = Math.floor(positionSize / entryPrice)

          if (quantity >= 1 && capital >= entryPrice * quantity) {
            capital -= entryPrice * quantity

            positions.set(opp.symbol, {
              ticker: opp.symbol,
              entryDate: dateStr,
              entryPrice: entryPrice,
              currentPrice: entryPrice,
              quantity: quantity,
              highWaterMark: entryPrice,
              trailingStop: entryPrice * (1 - run.trailingStopPct.toNumber() / 100),
              unrealizedPnl: 0,
              daysHeld: 0
            })
          }
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Close any remaining positions at end date
    for (const [ticker, position] of positions.entries()) {
      const exitPrice = position.currentPrice
      const pnl = (exitPrice - position.entryPrice) * position.quantity
      const holdTimeMinutes = position.daysHeld * 24 * 60

      trades.push({
        ticker: position.ticker,
        entryDate: position.entryDate,
        exitDate: end.toISOString().split('T')[0],
        entryPrice: position.entryPrice,
        exitPrice: exitPrice,
        quantity: position.quantity,
        pnl: pnl,
        holdTimeMinutes: holdTimeMinutes,
        exitReason: 'TIME_CUTOFF'
      })

      if (pnl > 0) {
        totalWins++
        totalGain += pnl
      } else {
        totalLosses++
        totalLoss += Math.abs(pnl)
      }
    }

    // Calculate final metrics
    const totalReturn = ((portfolioValue - run.startingCapital.toNumber()) / run.startingCapital.toNumber()) * 100
    const totalReturnDollars = portfolioValue - run.startingCapital.toNumber()
    const totalTrades = trades.length
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0
    const profitFactor = totalLoss > 0 ? totalGain / totalLoss : totalGain > 0 ? 999 : 0
    
    const avgWinAmount = totalWins > 0 ? totalGain / totalWins : 0
    const avgLossAmount = totalLosses > 0 ? totalLoss / totalLosses : 0
    const avgHoldTimeDays = totalTrades > 0 ? trades.reduce((sum, t) => sum + (t.holdTimeMinutes / (60 * 24)), 0) / totalTrades : 0

    // Calculate Sharpe Ratio (simplified) - assuming risk-free rate of 0
    const returns = trades.map(t => (t.pnl / run.startingCapital.toNumber()) * 100)
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0
    const stdDev = returns.length > 0 ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length) : 0
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0

    // Save trades to database
    for (const trade of trades) {
      await prisma.trade.create({
        data: {
          userId: run.userId,
          ticker: trade.ticker,
          paperTradingRunId: runId,
          quantity: trade.quantity,
          entryPrice: trade.entryPrice,
          exitPrice: trade.exitPrice,
          realizedPnl: trade.pnl,
          entryTime: new Date(trade.entryDate),
          exitTime: new Date(trade.exitDate),
          holdTimeMinutes: trade.holdTimeMinutes,
          exitReason: trade.exitReason,
          strategy: run.screen?.name || 'Unknown'
        }
      })
    }

    // Update the run with final results
    await prisma.paperTradingRun.update({
      where: { id: runId },
      data: {
        status: 'COMPLETED',
        finalCapital: portfolioValue,
        totalReturn: totalReturn,
        totalReturnDollars: totalReturnDollars,
        totalTrades: totalTrades,
        winningTrades: totalWins,
        losingTrades: totalLosses,
        winRate: winRate,
        avgWinAmount: avgWinAmount,
        avgLossAmount: avgLossAmount,
        sharpeRatio: sharpeRatio,
        maxDrawdown: maxDrawdown,
        profitFactor: profitFactor,
        avgHoldTimeDays: avgHoldTimeDays,
        completedAt: new Date()
      }
    })

    console.log(`Paper trading backtest complete for run ${runId}: ${totalTrades} trades, ${totalReturn.toFixed(2)}% return`)
  }
}

export const tradingEngine = new TradingEngine()
