import { prisma } from './lib/db';
import 'dotenv/config';

async function checkScreenStocks() {
  try {
    console.log('\n=== DIAGNOSING EARNINGS SCREEN ISSUE ===\n');
    
    // Find the screen
    const screens = await prisma.screen.findMany({
      where: {
        screenType: 'EARNINGS',
        name: {
          contains: 'Dec 3'
        }
      },
      include: {
        watchlistItems: true
      }
    });
    
    console.log(`Found ${screens.length} earnings screen(s) matching "Dec 3"\n`);
    
    for (const screen of screens) {
      console.log('📊 Screen:', screen.name);
      console.log('   Created:', screen.createdAt.toISOString());
      console.log('   Type:', screen.screenType);
      console.log('   Monitored Stocks:', screen.watchlistItems.length);
      console.log('   Min Earnings Surprise:', screen.minEarningsSurprise, '%');
      console.log('   Max Positions:', screen.maxPositions);
      
      if (screen.watchlistItems.length === 0) {
        console.log('\n   ❌ PROBLEM: No stocks are being monitored!');
      } else {
        console.log('   ✅ Watchlist populated');
        console.log('   Sample tickers:', screen.watchlistItems.slice(0, 5).map((w: typeof screen.watchlistItems[0]) => w.ticker).join(', '));
      }
      console.log('');
    }
    
    // Check earnings calendar for Dec 3-4
    console.log('\n📅 Checking Earnings Calendar Data:');
    
    const dec3Earnings = await prisma.earningsCalendar.findMany({
      where: {
        earningsDate: {
          gte: new Date('2025-12-03T00:00:00Z'),
          lt: new Date('2025-12-05T00:00:00Z')
        }
      },
      orderBy: {
        earningsDate: 'asc'
      },
      take: 50
    });
    
    console.log(`\nEarnings scheduled for Dec 3-4: ${dec3Earnings.length} total`);
    if (dec3Earnings.length > 0) {
      console.log('\nSample stocks:');
      dec3Earnings.slice(0, 10).forEach((e: typeof dec3Earnings[0]) => {
        console.log(`  ${e.symbol} - ${e.earningsDate.toISOString().split('T')[0]} (Est EPS: ${e.estimatedEPS}, Actual: ${e.actualEPS || 'pending'})`);
      });
    } else {
      console.log('\n❌ No earnings data found in calendar for Dec 3-4!');
      console.log('   This could mean the earnings calendar needs to be refreshed.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkScreenStocks();
