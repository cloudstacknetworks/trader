import { prisma } from '../lib/db';
import 'dotenv/config';

async function diagnoseEarningsScreen() {
  try {
    console.log('\n=== DIAGNOSING EARNINGS SCREEN ===\n');
    
    // Get the broken screen
    const screen = await prisma.screen.findFirst({
      where: {
        name: {
          contains: 'All Earnings Reports Mon & Tue Dec 3'
        }
      }
    });
    
    if (!screen) {
      console.log('Screen not found!');
      return;
    }
    
    console.log('✅ Found screen:', screen.name);
    console.log('   Screen ID:', screen.id);
    console.log('   Current watchlist size: 0 ❌');
    
    // Get ALL earnings for Dec 3-4
    const earnings = await prisma.earningsCalendar.findMany({
      where: {
        earningsDate: {
          gte: new Date('2025-12-03T00:00:00Z'),
          lt: new Date('2025-12-05T00:00:00Z')
        },
        estimatedEPS: {
          not: null
        }
      }
    });
    
    console.log(`\n✅ Found ${earnings.length} stocks with earnings Dec 3-4`);
    
    // Get stock data for these symbols
    const symbols = earnings.map(e => e.symbol);
    const stockData = await prisma.stockData.findMany({
      where: {
        symbol: {
          in: symbols
        },
        hasError: false,
        currentPrice: {
          not: null,
          gte: 5 // Price > $5
        }
      }
    });
    
    const validTickers = new Set(stockData.map(s => s.symbol));
    const qualityEarnings = earnings.filter(e => validTickers.has(e.symbol));
    
    console.log(`✅ Quality stocks (with data, price >$5): ${qualityEarnings.length}`);
    
    if (qualityEarnings.length === 0) {
      console.log('\n❌ ERROR: No quality stocks found!');
      console.log('   This means stock data hasn\'t been downloaded yet.');
      console.log('   Go to Dashboard → Market and start the stock data download.');
      return;
    }
    
    console.log('\n📋 Sample stocks that should be monitored:');
    console.log('┌─────────┬────────┬──────────┬────────────┐');
    console.log('│ Symbol  │ Price  │ Est EPS  │ Date       │');
    console.log('├─────────┼────────┼──────────┼────────────┤');
    
    for (let i = 0; i < Math.min(15, qualityEarnings.length); i++) {
      const e = qualityEarnings[i];
      const stock = stockData.find(s => s.symbol === e.symbol);
      const price = stock?.currentPrice ? `$${Number(stock.currentPrice).toFixed(2)}` : '$0.00';
      console.log(`│ ${e.symbol.padEnd(7)} │ ${price.padEnd(6)} │ ${(e.estimatedEPS || 0).toFixed(2).toString().padEnd(8)} │ ${e.earningsDate.toISOString().split('T')[0]} │`);
    }
    console.log('└─────────┴────────┴──────────┴────────────┘');
    
    if (qualityEarnings.length > 15) {
      console.log(`... and ${qualityEarnings.length - 15} more stocks`);
    }
    
    console.log('\n\n🔧 ROOT CAUSE:');
    console.log('   When you created this screen, no stocks were selected/added to the watchlist.');
    console.log('   Without stocks in the watchlist, the system has nothing to trade.\n');
    
    console.log('🔧 SOLUTION OPTIONS:\n');
    console.log('OPTION 1 (Recommended): Recreate the screen properly');
    console.log('  1. Go to: https://trader.cloudstacknetworks.com/dashboard/earnings');
    console.log('  2. Set date filter to Dec 3-4, 2025');
    console.log('  3. Apply any filters you want (P/E, market cap, etc.)');
    console.log('  4. CHECK THE BOXES next to stocks you want to monitor');
    console.log(`  5. Click "Create Screen from Selected" (up to ${screen.maxPositions} will trade per day)`);
    console.log('  6. Go to Screens tab and delete the old empty one\n');
    
    console.log('OPTION 2: I can auto-populate this screen now');
    console.log(`  This will add all ${qualityEarnings.length} quality stocks to the existing screen`);
    console.log('  The system will trade up to', screen.maxPositions, 'per day');
    console.log('  Reply "yes" if you want me to do this automatically\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseEarningsScreen();