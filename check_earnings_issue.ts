import { prisma } from './lib/db';
import 'dotenv/config';

async function checkEarningsIssue() {
  try {
    console.log('\n=== CHECKING EARNINGS TRADING ISSUE ===\n');
    
    // Check current date
    const today = new Date();
    console.log('Today is:', today.toISOString().split('T')[0], '(', today.toLocaleDateString('en-US', { weekday: 'long' }), ')');
    
    // Get the screen
    const screen = await prisma.screen.findFirst({
      where: {
        name: {
          contains: 'All Earnings Reports Mon & Tue Dec 3'
        }
      },
      include: {
        watchlistItems: true
      }
    });
    
    if (!screen) {
      console.log('\n❌ Screen not found!');
      return;
    }
    
    console.log('\n📊 Screen Details:');
    console.log('Name:', screen.name);
    console.log('Type:', screen.screenType);
    console.log('Min Earnings Surprise:', screen.minEarningsSurprise, '%');
    console.log('Max Positions:', screen.maxPositions);
    console.log('Monitored Stocks:', screen.watchlistItems.length);
    
    const tickers = screen.watchlistItems.map((w: typeof screen.watchlistItems[0]) => w.ticker);
    console.log('\nTickers:', tickers.slice(0, 10).join(', '), '...and', tickers.length - 10, 'more');
    
    // Check earnings for these tickers
    const dec2 = '2025-12-02';
    const dec3 = '2025-12-03';
    const dec4 = '2025-12-04';
    
    console.log('\n📅 Earnings Schedule:');
    
    const earningsDec2 = await prisma.earningsCalendar.findMany({
      where: {
        symbol: { in: tickers },
        earningsDate: dec2
      }
    });
    console.log(`\nDec 2 (TODAY - Monday): ${earningsDec2.length} earnings scheduled`);
    if (earningsDec2.length > 0) {
      console.log('  Reported (actualEPS != null):', earningsDec2.filter((e: typeof earningsDec2[0]) => e.actualEPS !== null).length);
      console.log('  Pending (actualEPS = null):', earningsDec2.filter((e: typeof earningsDec2[0]) => e.actualEPS === null).length);
      console.log('  Sample:', earningsDec2.slice(0, 3).map((e: typeof earningsDec2[0]) => `${e.symbol} (${e.actualEPS ? 'reported' : 'pending'})`).join(', '));
    }
    
    const earningsDec3 = await prisma.earningsCalendar.findMany({
      where: {
        symbol: { in: tickers },
        earningsDate: dec3
      }
    });
    console.log(`\nDec 3 (TOMORROW - Tuesday): ${earningsDec3.length} earnings scheduled`);
    if (earningsDec3.length > 0) {
      console.log('  Reported (actualEPS != null):', earningsDec3.filter((e: typeof earningsDec3[0]) => e.actualEPS !== null).length);
      console.log('  Pending (actualEPS = null):', earningsDec3.filter((e: typeof earningsDec3[0]) => e.actualEPS === null).length);
      console.log('  Sample:', earningsDec3.slice(0, 5).map((e: typeof earningsDec3[0]) => `${e.symbol} (${e.actualEPS ? 'reported' : 'pending'})`).join(', '));
    }
    
    const earningsDec4 = await prisma.earningsCalendar.findMany({
      where: {
        symbol: { in: tickers },
        earningsDate: dec4
      }
    });
    console.log(`\nDec 4 (Wednesday): ${earningsDec4.length} earnings scheduled`);
    if (earningsDec4.length > 0) {
      console.log('  Reported (actualEPS != null):', earningsDec4.filter((e: typeof earningsDec4[0]) => e.actualEPS !== null).length);
      console.log('  Pending (actualEPS = null):', earningsDec4.filter((e: typeof earningsDec4[0]) => e.actualEPS === null).length);
      console.log('  Sample:', earningsDec4.slice(0, 5).map((e: typeof earningsDec4[0]) => `${e.symbol} (${e.actualEPS ? 'reported' : 'pending'})`).join(', '));
    }
    
    // Check if automation ran today
    console.log('\n🤖 Checking if earnings automation ran today...');
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    
    const trades = await prisma.trade.findMany({
      where: {
        screenId: screen.id,
        entryTime: {
          gte: todayStart
        }
      }
    });
    
    console.log('Trades executed today for this screen:', trades.length);
    if (trades.length > 0) {
      console.log('Trade details:', trades.map((t: typeof trades[0]) => `${t.ticker} at ${t.entryPrice}`).join(', '));
    }
    
    // Check trading account status
    const account = await prisma.tradingAccount.findFirst({
      where: {
        userId: screen.userId
      }
    });
    
    console.log('\n⚙️ Account Automation Status:');
    console.log('Automation Enabled:', account?.automationEnabled);
    console.log('Paper Trading:', account?.isPaperTrading);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEarningsIssue();
