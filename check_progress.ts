import 'dotenv/config';
import { prisma } from './lib/db.js';

async function main() {
  const total = await prisma.stockData.count();
  const withData = await prisma.stockData.count({ 
    where: { hasError: false, currentPrice: { not: null } } 
  });
  const needsDownload = await prisma.stockData.count({ 
    where: { OR: [{ hasError: true }, { currentPrice: null }] } 
  });
  
  // Check how many need refresh (stale data - older than 24 hours)
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);
  const needsRefresh = await prisma.stockData.count({
    where: {
      hasError: false,
      currentPrice: { not: null },
      lastUpdated: { lt: yesterday }
    }
  });
  
  console.log('\n=== DATABASE STATUS ===');
  console.log(`Total stocks: ${total}`);
  console.log(`With complete data: ${withData}`);
  console.log(`Need download (missing/error): ${needsDownload}`);
  console.log(`Need refresh (stale data >24h): ${needsRefresh}`);
  console.log(`Fresh data (<24h old): ${withData - needsRefresh}`);
  console.log('');
  
  await prisma.$disconnect();
}

main();
