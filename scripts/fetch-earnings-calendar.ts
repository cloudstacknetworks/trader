import 'dotenv/config'
import { prisma } from '../lib/db'
import { finnhubClient } from '../lib/finnhub'

// Fetch earnings calendar for the next 30 days and update database
async function fetchEarningsCalendar() {
  console.log('📅 Starting earnings calendar fetch...')

  try {
    // Get date range for next 30 days
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + 30)

    const from = today.toISOString().split('T')[0]
    const to = futureDate.toISOString().split('T')[0]

    console.log(`\n📅 Fetching earnings from ${from} to ${to}...`)

    // Fetch from Finnhub
    const calendarData = await finnhubClient.getEarningsCalendar(from, to)

    if (!calendarData || !calendarData.earningsCalendar) {
      console.log('⚠️  No earnings calendar data returned from Finnhub')
      return
    }

    const earnings = calendarData.earningsCalendar
    console.log(`📊 Found ${earnings.length} earnings announcements`)

    let added = 0
    let updated = 0
    let skipped = 0

    for (const earning of earnings) {
      try {
        const {
          symbol,
          date,
          quarter,
          year,
          epsEstimate,
          epsActual
        } = earning

        if (!symbol || !date) {
          skipped++
          continue
        }

        // Convert date to DateTime
        const earningsDate = new Date(date)

        // Determine fiscal quarter
        const fiscalQuarter = quarter ? `Q${quarter}` : 'N/A'

        // Check if this earnings entry already exists
        const existing = await prisma.earningsCalendar.findUnique({
          where: {
            symbol_earningsDate: {
              symbol: symbol.toUpperCase(),
              earningsDate
            }
          }
        })

        if (existing) {
          // Update if actual EPS is now available
          if (epsActual !== null && existing.actualEPS === null) {
            await prisma.earningsCalendar.update({
              where: { id: existing.id },
              data: {
                actualEPS: epsActual,
                beat: epsEstimate && epsActual ? epsActual > epsEstimate : null,
                surprise: epsEstimate && epsActual
                  ? ((epsActual - epsEstimate) / Math.abs(epsEstimate)) * 100
                  : null
              }
            })
            updated++
          } else {
            skipped++
          }
        } else {
          // Create new entry
          await prisma.earningsCalendar.create({
            data: {
              symbol: symbol.toUpperCase(),
              earningsDate,
              fiscalQuarter,
              fiscalYear: year || new Date(date).getFullYear(),
              estimatedEPS: epsEstimate,
              actualEPS: epsActual,
              beat: epsEstimate && epsActual ? epsActual > epsEstimate : null,
              surprise: epsEstimate && epsActual
                ? ((epsActual - epsEstimate) / Math.abs(epsEstimate)) * 100
                : null
            }
          })
          added++
        }
      } catch (error: any) {
        console.error(`Error processing ${earning.symbol}:`, error.message)
        skipped++
      }
    }

    console.log(`\n✅ Earnings calendar fetch complete!`)
    console.log(`   Added: ${added}`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Skipped: ${skipped}`)

  } catch (error) {
    console.error('❌ Error fetching earnings calendar:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the function
fetchEarningsCalendar()
