#!/usr/bin/env tsx
/**
 * Daily Earnings Opportunities Checker
 * 
 * Runs daily at 9:30 AM ET (market open) to:
 * 1. Identify all active earnings screening strategies
 * 2. Check if any monitored stocks beat earnings estimates today
 * 3. Automatically execute trades for qualified opportunities
 * 
 * This is the automation backbone for earnings-based trading.
 */

import 'dotenv/config';
import { prisma } from '../lib/db';
import { TradingEngine } from '../lib/trading-engine';
import { notificationService } from '../lib/notification-service';

const tradingEngine = new TradingEngine();

interface EarningsResult {
  screenId: string;
  screenName: string;
  opportunities: number;
  executed: number;
  error?: string;
}

async function checkDailyEarnings() {
  const startTime = new Date();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Daily Earnings Check - ${startTime.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);
  console.log('='.repeat(60));

  try {
    // 1. Find all active EARNINGS screens
    const earningsScreens = await prisma.screen.findMany({
      where: {
        screenType: 'EARNINGS',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        minEarningsSurprise: true,
        maxPositions: true,
        _count: {
          select: { watchlistItems: true },
        },
      },
    });

    console.log(`\nFound ${earningsScreens.length} active earnings screens\n`);

    if (earningsScreens.length === 0) {
      console.log('No active earnings screens found. Exiting.');
      await prisma.$disconnect();
      return;
    }

    // 2. Find all users with automation enabled
    const automatedUsers = await prisma.tradingAccount.findMany({
      where: { automationEnabled: true },
      select: {
        userId: true,
        user: { select: { email: true } },
      },
    });

    console.log(`Found ${automatedUsers.length} users with automation enabled\n`);

    if (automatedUsers.length === 0) {
      console.log('No users with automation enabled. Exiting.');
      await prisma.$disconnect();
      return;
    }

    // 3. Process each screen for each user
    const results: EarningsResult[] = [];

    for (const screen of earningsScreens) {
      console.log(`Processing: "${screen.name}"`);
      console.log(`  - Monitored stocks: ${screen._count.watchlistItems}`);
      console.log(`  - Min surprise threshold: ${screen.minEarningsSurprise}%`);
      console.log(`  - Max positions: ${screen.maxPositions || 10}`);
      console.log(`  - Running for ${automatedUsers.length} users with automation enabled\n`);

      // Get monitored stocks for this screen
      const watchlistItems = await prisma.watchlistItem.findMany({
        where: { screenId: screen.id },
        select: { ticker: true }
      });
      const monitoredTickers = watchlistItems.map(item => item.ticker);

      // Get earnings data for monitored stocks (last 7 days window)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const earningsData = await prisma.earningsCalendar.findMany({
        where: {
          symbol: { in: monitoredTickers },
          earningsDate: { gte: sevenDaysAgo }
        },
        orderBy: { earningsDate: 'desc' }
      });

      for (const user of automatedUsers) {
        console.log(`  User: ${user.user.email}`);

        try {
          // Identify and execute opportunities for this user
          const opportunities = await tradingEngine.identifyEarningsOpportunities(
            screen.id,
            user.userId
          );

          console.log(`    ✅ Found ${opportunities.length} qualified opportunities`);
          if (opportunities.length > 0) {
            opportunities.forEach((opp, idx) => {
              console.log(`       ${idx + 1}. ${opp.ticker} - Surprise: +${opp.surprise.toFixed(2)}%`);
            });
          } else {
            // Send EOD notification when 0 opportunities found
            console.log(`    📧 Sending no-opportunities notification to ${user.user.email}`);
            
            // Build earnings monitor data
            const monitoredStocksData = monitoredTickers.map(ticker => {
              const earnings = earningsData.find(e => e.symbol === ticker);
              
              let passedScreen = false;
              let reason = 'No earnings reported in last 7 days';
              
              if (earnings) {
                if (earnings.actualEPS === null) {
                  reason = 'Earnings not yet reported';
                } else if (earnings.surprise === null) {
                  reason = 'Surprise percentage not available';
                } else if (earnings.surprise < Number(screen.minEarningsSurprise)) {
                  passedScreen = false;
                  reason = `Below ${screen.minEarningsSurprise}% surprise threshold`;
                } else {
                  // This would have been traded, but might have been filtered by max positions
                  passedScreen = true;
                  reason = 'Met criteria but not selected (max positions limit)';
                }
              }
              
              return {
                ticker,
                earningsDate: earnings?.earningsDate || null,
                estimatedEPS: earnings?.estimatedEPS ? Number(earnings.estimatedEPS) : null,
                actualEPS: earnings?.actualEPS ? Number(earnings.actualEPS) : null,
                surprise: earnings?.surprise ? Number(earnings.surprise) : null,
                passedScreen,
                reason
              };
            });

            await notificationService.sendNoEarningsOpportunities({
              userId: user.userId,
              userEmail: user.user.email,
              screenName: screen.name,
              screenId: screen.id,
              monitoredStocks: monitoredStocksData,
              minSurpriseThreshold: Number(screen.minEarningsSurprise),
              date: new Date()
            });
          }

          results.push({
            screenId: screen.id,
            screenName: `${screen.name} (${user.user.email})`,
            opportunities: opportunities.length,
            executed: opportunities.length,
          });

          console.log();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`    ❌ Error: ${errorMessage}\n`);
          results.push({
            screenId: screen.id,
            screenName: `${screen.name} (${user.user.email})`,
            opportunities: 0,
            executed: 0,
            error: errorMessage,
          });
        }
      }

      console.log();
    }

    // 4. Summary Report
    const endTime = new Date();
    const duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(2);

    console.log('='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Screens processed: ${earningsScreens.length}`);
    console.log(`Total opportunities found: ${results.reduce((sum, r) => sum + r.opportunities, 0)}`);
    console.log(`Total trades executed: ${results.reduce((sum, r) => sum + r.executed, 0)}`);
    console.log(`Errors: ${results.filter(r => r.error).length}`);
    console.log(`Duration: ${duration}s`);
    console.log('='.repeat(60));

    // Log errors if any
    const errored = results.filter(r => r.error);
    if (errored.length > 0) {
      console.log('\nScreens with errors:');
      errored.forEach(r => {
        console.log(`  - ${r.screenName}: ${r.error}`);
      });
    }

    console.log('\nDaily earnings check completed successfully.\n');
  } catch (error) {
    console.error('\n❌ FATAL ERROR during daily earnings check:');
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  checkDailyEarnings()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { checkDailyEarnings };
