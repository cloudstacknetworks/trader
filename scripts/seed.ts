
import { prisma } from '../lib/db'
import bcryptjs from 'bcryptjs'

async function main() {
  console.log('Starting database seed...')

  // Create default screens
  const screens = [
    {
      name: 'O\'Shaughnessy Value',
      description: 'Classic O\'Shaughnessy value screening with low P/E and P/S ratios',
      peRatioMax: 15,
      psRatioMax: 1.5,
      momentumMin: 5,
      marketCapMin: 50000000,
      isActive: true,
    },
    {
      name: 'O\'Shaughnessy Growth',
      description: 'Growth-oriented screening with momentum focus',
      peRatioMax: 25,
      psRatioMax: 3,
      momentumMin: 15,
      marketCapMin: 100000000,
      isActive: true,
    },
    {
      name: 'O\'Shaughnessy Small Cap',
      description: 'Small cap opportunities with quality metrics',
      peRatioMax: 20,
      psRatioMax: 2,
      momentumMin: 10,
      marketCapMin: 10000000,
      isActive: true,
    },
  ]

  for (const screenData of screens) {
    await prisma.screen.upsert({
      where: { name: screenData.name },
      update: screenData,
      create: screenData,
    })
  }

  // Create test user
  const hashedPassword = await bcryptjs.hash('johndoe123', 10)
  const testUser = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'John Doe',
      password: hashedPassword,
    },
  })

  // Create trading account for test user
  await prisma.tradingAccount.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      isPaperTrading: true,
      startingCapital: 1000,
      currentValue: 1000,
      totalPnl: 0,
      maxPositions: 5,
      trailingStopPct: 0.75,
      timeCutoffHour: 16,
      timeCutoffMin: 0,
      automationEnabled: true,
      emailNotifications: true,
    },
  })

  // Create some sample watchlist items
  const sampleStocks = [
    { ticker: 'AAPL', score: 8.5, peRatio: 28.5, psRatio: 7.2, momentum: 12.5, marketCap: 3000000000000 },
    { ticker: 'MSFT', score: 7.8, peRatio: 32.1, psRatio: 13.4, momentum: 8.3, marketCap: 2800000000000 },
    { ticker: 'NVDA', score: 8.9, peRatio: 65.2, psRatio: 24.1, momentum: 45.2, marketCap: 1800000000000 },
    { ticker: 'GOOGL', score: 7.2, peRatio: 22.8, psRatio: 5.1, momentum: 15.8, marketCap: 1600000000000 },
    { ticker: 'TSLA', score: 6.5, peRatio: 78.3, psRatio: 9.8, momentum: 22.1, marketCap: 800000000000 },
  ]

  const valueScreen = await prisma.screen.findFirst({
    where: { name: 'O\'Shaughnessy Value' },
  })

  if (valueScreen) {
    for (const stock of sampleStocks) {
      await prisma.watchlistItem.upsert({
        where: {
          ticker_screenId: {
            ticker: stock.ticker,
            screenId: valueScreen.id,
          },
        },
        update: stock,
        create: {
          ...stock,
          screenId: valueScreen.id,
          currentPrice: Math.random() * 200 + 50, // Random price between $50-$250
          newsCount: Math.floor(Math.random() * 5),
          sentimentScore: (Math.random() - 0.5) * 2, // Random sentiment between -1 and 1
        },
      })
    }
  }

  // Create scheduled jobs
  const scheduledJobs = [
    {
      name: 'daily_data_refresh',
      cronExpression: '0 2 * * *', // Every day at 2 AM ET
      isEnabled: true,
    },
    {
      name: 'weekly_screening',
      cronExpression: '0 23 * * SUN', // Sunday 11 PM ET
      isEnabled: true,
    },
    {
      name: 'monthly_refresh',
      cronExpression: '0 23 1-7 * SUN', // First Sunday of month 11 PM ET
      isEnabled: true,
    },
    {
      name: 'daily_news_analysis',
      cronExpression: '0 7 * * MON-FRI', // Weekdays 7 AM ET
      isEnabled: true,
    },
    {
      name: 'daily_trade_execution',
      cronExpression: '30 9 * * MON-FRI', // Weekdays 9:30 AM ET
      isEnabled: true,
    },
    {
      name: 'position_monitoring',
      cronExpression: '*/15 9-16 * * MON-FRI', // Every 15 min, 9 AM - 4 PM ET weekdays
      isEnabled: true,
    },
    {
      name: 'daily_summary',
      cronExpression: '30 16 * * MON-FRI', // Weekdays 4:30 PM ET (after market close)
      isEnabled: true,
    },
  ]

  for (const job of scheduledJobs) {
    await prisma.scheduledJob.upsert({
      where: { name: job.name },
      update: job,
      create: job,
    })
  }

  console.log('Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })