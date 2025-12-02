import 'dotenv/config';
import { prisma } from './lib/db.js';

async function checkOldScreenItems() {
  const oldScreenId = 'cmigflfuj0000lj08hldl5p1e'; // Old screen ID
  
  // Check if there are ANY watchlist items for this screen
  const count = await prisma.watchlistItem.count({
    where: { screenId: oldScreenId }
  });
  
  console.log(`\n=== OLD SCREEN WATCHLIST ITEMS ===`);
  console.log(`Screen ID: ${oldScreenId}`);
  console.log(`Watchlist item count: ${count}\n`);
  
  if (count > 0) {
    const items = await prisma.watchlistItem.findMany({
      where: { screenId: oldScreenId },
      select: { ticker: true, dateAdded: true },
      take: 10
    });
    
    console.log('Sample items:');
    items.forEach(item => {
      console.log(`  ${item.ticker} (added: ${item.dateAdded.toISOString()})`);
    });
  } else {
    console.log('❌ The old screen truly has NO watchlist items in the database.');
    
    // Check if those tickers now belong to the NEW screen
    const newScreenId = 'cminxwoqs0000qe08zg9np55v';
    const newItems = await prisma.watchlistItem.findMany({
      where: { screenId: newScreenId },
      select: { ticker: true, dateAdded: true },
      take: 10
    });
    
    console.log(`\n✅ NEW screen has ${newItems.length} items (showing first 10):`);
    newItems.forEach(item => {
      console.log(`  ${item.ticker} (added: ${item.dateAdded.toISOString()})`);
    });
  }
  
  await prisma.$disconnect();
}

checkOldScreenItems();
