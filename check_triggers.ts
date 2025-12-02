import 'dotenv/config';
import { prisma } from './lib/db.js';

async function checkTriggers() {
  const triggers: any = await prisma.$queryRaw`
    SELECT 
      trigger_name,
      event_manipulation,
      event_object_table,
      action_statement
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND (event_object_table = 'watchlist_items' OR event_object_table = 'Screen')
    ORDER BY event_object_table, trigger_name;
  `;
  
  console.log('\n=== DATABASE TRIGGERS ===\n');
  if (triggers.length === 0) {
    console.log('No triggers found on watchlist_items or Screen tables');
  } else {
    console.log(JSON.stringify(triggers, null, 2));
  }
  
  await prisma.$disconnect();
}

checkTriggers();
