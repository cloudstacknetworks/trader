import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStockData() {
  try {
    const totalStocks = await prisma.stockData.count();
    const healthyStocks = await prisma.stockData.count({
      where: { hasError: false }
    });
    const latestUpdate = await prisma.stockData.findFirst({
      orderBy: { lastUpdated: 'desc' },
      select: { lastUpdated: true }
    });
    
    console.log('=== STOCK DATA STATUS ===');
    console.log(`Total stocks in database: ${totalStocks}`);
    console.log(`Healthy stocks (no errors): ${healthyStocks}`);
    console.log(`Latest update: ${latestUpdate?.lastUpdated || 'N/A'}`);
    
    if (totalStocks === 0) {
      console.log('\n⚠️  NO STOCK DATA FOUND - Initial download needs to be run!');
    } else {
      console.log(`\n✅ Stock data is available`);
    }
  } catch (error) {
    console.error('Error checking stock data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStockData();
