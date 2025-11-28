
/**
 * Daily Summary Script
 * Runs at 4:30 PM ET to send daily trading summary to all users
 */

import 'dotenv/config'
import { prisma } from '../lib/db'
import { notificationService } from '../lib/notification-service'

async function sendDailySummaries() {
  console.log('Starting daily summary generation...')

  try {
    // Get all users with trading accounts
    const users = await prisma.user.findMany({
      include: {
        tradingAccount: true
      }
    })

    console.log(`Found ${users.length} users`)

    for (const user of users) {
      try {
        // Skip if user has disabled daily summaries
        if (!user.tradingAccount?.dailySummaryEmail) {
          console.log(`Skipping user ${user.email} - daily summaries disabled`)
          continue
        }

        // Get today's trades (closed positions)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const todaysTrades = await prisma.trade.findMany({
          where: {
            userId: user.id,
            exitTime: {
              gte: today
            }
          },
          orderBy: {
            exitTime: 'desc'
          }
        })

        // Get open positions
        const openPositions = await prisma.position.findMany({
          where: {
            userId: user.id,
            status: 'OPEN'
          }
        })

        // Calculate statistics
        const totalTrades = todaysTrades.length
        const winningTrades = todaysTrades.filter(t => Number(t.realizedPnl) > 0).length
        const losingTrades = todaysTrades.filter(t => Number(t.realizedPnl) < 0).length
        const totalPnl = todaysTrades.reduce((sum, t) => sum + Number(t.realizedPnl), 0)
        
        // Find top and worst performers
        const sortedTrades = [...todaysTrades].sort((a, b) => 
          Number(b.realizedPnl) - Number(a.realizedPnl)
        )
        const topPerformer = sortedTrades[0] ? {
          ticker: sortedTrades[0].ticker,
          pnl: Number(sortedTrades[0].realizedPnl)
        } : undefined
        
        const worstPerformer = sortedTrades[sortedTrades.length - 1] && 
          Number(sortedTrades[sortedTrades.length - 1].realizedPnl) < 0 ? {
          ticker: sortedTrades[sortedTrades.length - 1].ticker,
          pnl: Number(sortedTrades[sortedTrades.length - 1].realizedPnl)
        } : undefined

        // Only send summary if there's activity (trades or open positions)
        if (totalTrades > 0 || openPositions.length > 0) {
          await notificationService.sendDailySummary({
            userId: user.id,
            totalTrades,
            winningTrades,
            losingTrades,
            totalPnl,
            openPositions: openPositions.length,
            closedPositions: totalTrades,
            topPerformer,
            worstPerformer
          })

          console.log(`✓ Sent daily summary to ${user.email}`)
        } else {
          console.log(`- No activity for ${user.email}, skipping summary`)
        }

      } catch (error) {
        console.error(`Error generating summary for user ${user.email}:`, error)
      }
    }

    console.log('Daily summary generation completed')

  } catch (error) {
    console.error('Fatal error in daily summary script:', error)
    process.exit(1)
  }
}

// Run the script
sendDailySummaries()
  .then(() => {
    console.log('Script finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
