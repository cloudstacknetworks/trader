import 'dotenv/config';
import { prisma } from './lib/db.js';

async function checkScreens() {
  const screens = await prisma.screen.findMany({
    where: {
      name: {
        contains: 'All Earnings Reports'
      }
    },
    include: {
      watchlistItems: {
        select: {
          ticker: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  console.log('\n=== ALL "All Earnings Reports" SCREENS ===\n');
  
  for (const screen of screens) {
    console.log(`Screen: ${screen.name}`);
    console.log(`  ID: ${screen.id}`);
    console.log(`  Created: ${screen.createdAt.toISOString()}`);
    console.log(`  Watchlist items: ${screen.watchlistItems.length}`);
    if (screen.watchlistItems.length > 0) {
      console.log(`  First 5 tickers: ${screen.watchlistItems.slice(0, 5).map(w => w.ticker).join(', ')}`);
    }
    console.log('');
  }
  
  // Check if any tickers are in BOTH screens
  if (screens.length >= 2) {
    const screen1Tickers = new Set(screens[0].watchlistItems.map(w => w.ticker));
    const screen2Tickers = new Set(screens[1].watchlistItems.map(w => w.ticker));
    
    const overlap = [...screen1Tickers].filter(t => screen2Tickers.has(t));
    
    console.log(`\nTicker overlap between screens: ${overlap.length}`);
    if (overlap.length > 0) {
      console.log(`Sample overlapping tickers: ${overlap.slice(0, 5).join(', ')}`);
    }
  }
  
  await prisma.$disconnect();
}

checkScreens();
