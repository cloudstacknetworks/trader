
import 'dotenv/config';
import { prisma } from '../lib/db.js';
import { alpacaDataClient } from '../lib/alpaca-data.js';
import { finnhubClient } from '../lib/finnhub.js';

const CHUNK_SIZE = 500; // Process 500 stocks per chunk
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 15000;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

interface ChunkStats {
  chunkNumber: number;
  totalInChunk: number;
  processed: number;
  successful: number;
  skipped: number;
  failed: number;
  startTime: Date;
  endTime?: Date;
}

async function downloadChunk(chunkNumber: number): Promise<ChunkStats> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📦 CHUNK ${chunkNumber} - Starting download`);
  console.log(`${'='.repeat(80)}\n`);

  const stats: ChunkStats = {
    chunkNumber,
    totalInChunk: 0,
    processed: 0,
    successful: 0,
    skipped: 0,
    failed: 0,
    startTime: new Date(),
  };

  try {
    // Get list of stocks that need downloading
    const needsDownload = await prisma.stockData.findMany({
      where: {
        OR: [
          { hasError: true },
          { currentPrice: null },
        ],
      },
      select: { symbol: true },
      take: CHUNK_SIZE,
      orderBy: { symbol: 'asc' },
    });

    stats.totalInChunk = needsDownload.length;

    if (needsDownload.length === 0) {
      console.log('✅ No stocks need downloading! All done!');
      stats.endTime = new Date();
      return stats;
    }

    console.log(`📊 Found ${needsDownload.length} stocks in this chunk\n`);

    // Process in batches
    for (let i = 0; i < needsDownload.length; i += BATCH_SIZE) {
      const batch = needsDownload.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(needsDownload.length / BATCH_SIZE);

      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} stocks)`);

      for (const { symbol } of batch) {
        let retries = 0;
        let success = false;

        while (retries < MAX_RETRIES && !success) {
          try {
            // Fetch from Alpaca
            const [snapshot, momentum, statistics] = await Promise.all([
              alpacaDataClient.getSnapshot(symbol),
              alpacaDataClient.calculateMomentum(symbol),
              alpacaDataClient.getStockStatistics(symbol),
            ]);

            // Try to get company info from Finnhub (optional)
            let companyProfile = null;
            try {
              companyProfile = await finnhubClient.getCompanyProfile(symbol);
            } catch (e) {
              // Silently skip if Finnhub fails
            }

            // Calculate data quality
            let quality = 0;
            if (snapshot?.latestTrade?.p) quality += 30;
            if (momentum) quality += 20;
            if (statistics) quality += 20;
            if (companyProfile) quality += 30;

            // Determine completeness
            let dataCompleteness: 'FULL' | 'PARTIAL' | 'BASIC' | 'MINIMAL' = 'MINIMAL';
            if (quality >= 80) dataCompleteness = 'FULL';
            else if (quality >= 60) dataCompleteness = 'PARTIAL';
            else if (quality >= 40) dataCompleteness = 'BASIC';

            // Update database
            await prisma.stockData.upsert({
              where: { symbol },
              create: {
                symbol,
                companyName: companyProfile?.name || symbol,
                exchange: snapshot?.latestTrade?.x || null,
                currentPrice: snapshot?.latestTrade?.p,
                previousClose: snapshot?.prevDailyBar?.c,
                volume: snapshot?.latestTrade?.s,
                marketCap: null,
                sector: companyProfile?.finnhubIndustry || null,
                momentum3M: momentum?.momentum3M,
                momentum6M: momentum?.momentum6M,
                momentum12M: momentum?.momentum12M,
                avgVolume: statistics?.avgVolume,
                volatility: statistics?.volatility,
                high52w: statistics?.high52w,
                low52w: statistics?.low52w,
                dataQuality: quality,
                dataCompleteness,
                lastUpdated: new Date(),
                hasError: false,
              },
              update: {
                companyName: companyProfile?.name || undefined,
                exchange: snapshot?.latestTrade?.x || undefined,
                currentPrice: snapshot?.latestTrade?.p,
                previousClose: snapshot?.prevDailyBar?.c,
                volume: snapshot?.latestTrade?.s,
                sector: companyProfile?.finnhubIndustry || undefined,
                momentum3M: momentum?.momentum3M,
                momentum6M: momentum?.momentum6M,
                momentum12M: momentum?.momentum12M,
                avgVolume: statistics?.avgVolume,
                volatility: statistics?.volatility,
                high52w: statistics?.high52w,
                low52w: statistics?.low52w,
                dataQuality: quality,
                dataCompleteness,
                lastUpdated: new Date(),
                hasError: false,
              },
            });

            stats.successful++;
            const icon = quality >= 80 ? '●' : quality >= 60 ? '◐' : quality >= 40 ? '◯' : '·';
            console.log(`  ${icon} ${symbol}: ${dataCompleteness} data (quality: ${quality})`);
            success = true;

          } catch (error: any) {
            retries++;
            if (retries < MAX_RETRIES) {
              console.log(`  ⚠️  ${symbol}: Retry ${retries}/${MAX_RETRIES}...`);
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            } else {
              // Mark as failed in database
              await prisma.stockData.update({
                where: { symbol },
                data: {
                  hasError: true,
                  lastUpdated: new Date(),
                },
              });
              stats.failed++;
              console.log(`  ✗ ${symbol}: Failed after ${MAX_RETRIES} retries`);
            }
          }
        }

        stats.processed++;
      }

      // Progress update
      const pct = ((stats.processed / stats.totalInChunk) * 100).toFixed(1);
      console.log(`   Progress: ${stats.processed}/${stats.totalInChunk} (${pct}%)`);
      console.log(`   Success: ${stats.successful}, Failed: ${stats.failed}`);

      // Wait between batches
      if (i + BATCH_SIZE < needsDownload.length) {
        console.log(`   ⏸  Waiting ${BATCH_DELAY_MS / 1000}s for API rate limits...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    stats.endTime = new Date();
    const duration = ((stats.endTime.getTime() - stats.startTime.getTime()) / 1000 / 60).toFixed(1);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ CHUNK ${chunkNumber} COMPLETE`);
    console.log(`${'='.repeat(80)}`);
    console.log(`⏱️  Duration: ${duration} minutes`);
    console.log(`📊 Processed: ${stats.processed}/${stats.totalInChunk}`);
    console.log(`✅ Successful: ${stats.successful}`);
    console.log(`✗ Failed: ${stats.failed}`);
    console.log(`Success rate: ${((stats.successful / stats.processed) * 100).toFixed(1)}%`);

    return stats;

  } catch (error) {
    console.error('❌ Chunk download failed:', error);
    stats.endTime = new Date();
    throw error;
  }
}

async function main() {
  const chunkArg = process.argv[2];
  
  if (!chunkArg) {
    console.log('Usage: yarn tsx scripts/download-alpaca-chunk.ts <chunk_number>');
    console.log('Example: yarn tsx scripts/download-alpaca-chunk.ts 1');
    console.log('\nUse chunk_number "auto" to automatically download next chunk');
    process.exit(1);
  }

  let chunkNumber: number;
  
  if (chunkArg === 'auto') {
    // Auto-determine next chunk
    const totalStocks = await prisma.stockData.count();
    const needsDownload = await prisma.stockData.count({
      where: {
        OR: [
          { hasError: true },
          { currentPrice: null },
        ],
      },
    });

    console.log(`\n📊 Database Status:`);
    console.log(`   Total stocks: ${totalStocks}`);
    console.log(`   Needs download: ${needsDownload}`);
    console.log(`   Complete: ${totalStocks - needsDownload}\n`);

    if (needsDownload === 0) {
      console.log('✅ All stocks downloaded! Nothing to do.');
      process.exit(0);
    }

    chunkNumber = Math.floor((totalStocks - needsDownload) / CHUNK_SIZE) + 1;
    console.log(`🎯 Auto-selected chunk #${chunkNumber}\n`);
  } else {
    chunkNumber = parseInt(chunkArg);
    if (isNaN(chunkNumber) || chunkNumber < 1) {
      console.error('❌ Chunk number must be a positive integer or "auto"');
      process.exit(1);
    }
  }

  const stats = await downloadChunk(chunkNumber);

  // Check if more chunks needed
  const stillNeedsDownload = await prisma.stockData.count({
    where: {
      OR: [
        { hasError: true },
        { currentPrice: null },
      ],
    },
  });

  if (stillNeedsDownload > 0) {
    console.log(`\n⏭️  ${stillNeedsDownload} stocks still need downloading`);
    console.log(`   Run next chunk with: yarn tsx scripts/download-alpaca-chunk.ts auto`);
  } else {
    console.log(`\n🎉 ALL STOCKS DOWNLOADED! Database is complete!`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
