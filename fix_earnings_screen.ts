import { prisma } from './lib/db';
import 'dotenv/config';

async function fixEarningsScreen() {
  try {
    console.log('\n=== PREPARING TO FIX EARNINGS SCREEN ===\n');
    
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
    
    console.log('Found screen:', screen.name);
    console.log('Screen ID:', screen.id);
    
    // Get ALL earnings for Dec 3-4 that meet basic criteria
    const earnings = await prisma.earningsCalendar.findMany({
      where: {
        earningsDate: {
          gte: new Date('2025-12-03T00:00:00Z'),
          lt: new Date('2025-12-05T00:00:00Z')
        },
        estimatedEPS: {
          not: null
        }
      },
      include: {
        stockData: true
      }
    });
    
    console.log(`\nFound ${earnings.length} stocks with earnings Dec 3-4`);
    
    // Filter for quality stocks (have stock data, not errors)
    const qualityStocks = earnings.filter((e: typeof earnings[0]) => 
      e.stockData && 
      !e.stockData.hasError && 
      e.stockData.currentPrice !== null &&
      e.stockData.currentPrice > 5 // Price > $5
    );
    
    console.log(`Quality stocks (price data, >$5): ${qualityStocks.length}`);
    
    if (qualityStocks.length === 0) {
      console.log('\n❌ No quality stocks found. Check if stock data is downloaded.');
      return;
    }
    
    console.log('\n📋 Stocks that should be monitored:');
    console.log('Symbol | Price | Est EPS | Date');
    console.log('-------|-------|---------|------');
    qualityStocks.slice(0, 20).forEach((e: typeof qualityStocks[0]) => {
      console.log(`${e.symbol.padEnd(7)}| $${(e.stockData?.currentPrice || 0).toFixed(2).padEnd(6)}| ${(e.estimatedEPS || 0).toFixed(2).padEnd(8)}| ${e.earningsDate.toISOString().split('T')[0]}`);
    });
    
    if (qualityStocks.length > 20) {
      console.log(`... and ${qualityStocks.length - 20} more`);
    }
    
    console.log('\n\n⚠️  RECOMMENDATION:');
    console.log('1. Go to Dashboard → Earnings Calendar');
    console.log('2. Set the date filter to Dec 3-4, 2025');
    console.log('3. Apply any filters you want (P/E, market cap, etc.)');
    console.log(`4. Select the stocks you want to monitor (up to ${screen.maxPositions} will trade)`);
    console.log('5. Click "Create Screen from Selected"');
    console.log('6. Delete the old empty screen\n');
    
    console.log('OR, I can automatically populate this screen with all quality stocks now.');
    console.log('This will add', qualityStocks.length, 'stocks to monitor.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEarningsScreen();
