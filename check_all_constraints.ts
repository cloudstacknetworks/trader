import 'dotenv/config';
import { prisma } from './lib/db.js';

async function checkAllConstraints() {
  // Check ALL constraints and indexes
  const result: any = await prisma.$queryRaw`
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'watchlist_items'
      AND schemaname = 'public'
    ORDER BY indexname;
  `;
  
  console.log('\n=== WATCHLIST_ITEMS TABLE INDEXES ===\n');
  console.log(JSON.stringify(result, null, 2));
  
  await prisma.$disconnect();
}

checkAllConstraints();
