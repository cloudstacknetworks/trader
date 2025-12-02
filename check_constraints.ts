import 'dotenv/config';
import { prisma } from './lib/db.js';

async function checkConstraints() {
  // Check database constraints
  const result: any = await prisma.$queryRaw`
    SELECT
      conname AS constraint_name,
      contype AS constraint_type,
      array_agg(att.attname) AS columns
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
    WHERE rel.relname = 'watchlist_items'
      AND nsp.nspname = 'public'
    GROUP BY conname, contype
    ORDER BY contype, conname;
  `;
  
  console.log('\n=== WATCHLIST_ITEMS TABLE CONSTRAINTS ===\n');
  console.log(JSON.stringify(result, null, 2));
  
  await prisma.$disconnect();
}

checkConstraints();
