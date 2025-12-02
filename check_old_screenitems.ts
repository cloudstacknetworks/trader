import 'dotenv/config';
import { prisma } from './lib/db.js';

async function checkHistory() {
  const oldScreenCreated = new Date('2025-11-26T20:02:25.530Z');
  const fiveMinutesAfter = new Date(oldScreenCreated.getTime() + 5 * 60 * 1000);
  
  console.log(`\n=== WATCHLIST ITEMS CREATED AROUND OLD SCREEN TIME ===`);
  console.log(`Old screen created: ${oldScreenCreated.toISOString()}`);
  console.log(`Checking for items created within 5 minutes...`);
  
  const items = await prisma.watchlistItem.findMany({
    where: {
      dateAdded: {
        gte: oldScreenCreated,
        lte: fiveMinutesAfter
      }
    },
    select: {
      ticker: true,
      screenId: true,
      dateAdded: true,
      screen: {
        select: {
          name: true
        }
      }
    }
  });
  
  console.log(`\nFound ${items.length} watchlist items created in that timeframe:`);
  
  if (items.length === 0) {
    console.log('❌ NO watchlist items were created when the old screen was created!');
    console.log('   This means the screen was ALWAYS empty from the start.');
  } else {
    const byScreen = new Map();
    items.forEach(item => {
      const screenName = item.screen?.name || 'Unknown';
      if (!byScreen.has(screenName)) {
        byScreen.set(screenName, []);
      }
      byScreen.get(screenName).push(item.ticker);
    });
    
    byScreen.forEach((tickers, screenName) => {
      console.log(`\nScreen: ${screenName}`);
      console.log(`  Tickers (${tickers.length}): ${tickers.slice(0, 10).join(', ')}${tickers.length > 10 ? '...' : ''}`);
    });
  }
  
  await prisma.$disconnect();
}

checkHistory();
