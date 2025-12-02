
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const screens = await prisma.screen.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(screens)
  } catch (error) {
    console.error('Get screens error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let screenName = 'Unnamed Screen' // For error messages
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const screenData = await request.json()
    console.log('📥 Received screen creation request:', JSON.stringify(screenData, null, 2))
    
    // Store screen name for error messages
    screenName = screenData.name || 'Unnamed Screen'
    
    // Extract monitored symbols if present (for EARNINGS screens)
    const monitoredSymbolsStr = screenData.monitoredSymbols
    let symbolsToAdd: string[] = []
    
    console.log(`🔍 DEBUG - monitoredSymbols received:`, {
      type: typeof monitoredSymbolsStr,
      value: monitoredSymbolsStr,
      length: monitoredSymbolsStr?.length
    })
    
    if (monitoredSymbolsStr) {
      try {
        symbolsToAdd = JSON.parse(monitoredSymbolsStr)
        console.log(`📋 Parsed ${symbolsToAdd.length} symbols to monitor:`, symbolsToAdd.slice(0, 5))
        console.log(`   First 5 symbols:`, symbolsToAdd.slice(0, 5))
        console.log(`   Is Array:`, Array.isArray(symbolsToAdd))
      } catch (e: any) {
        console.error('❌ CRITICAL: Failed to parse monitoredSymbols:', {
          error: e.message,
          stack: e.stack,
          rawValue: monitoredSymbolsStr
        })
      }
    } else {
      console.warn('⚠️  CRITICAL: monitoredSymbols is missing or empty in request!')
    }
    
    // Remove monitoredSymbols from screenData (not a Screen field)
    delete screenData.monitoredSymbols
    
    // Ensure numeric fields with large values don't exceed database limits
    // Fields with @db.Decimal(8,2) can only hold values up to 999999.99
    // Fields with @db.Decimal(15,2) can hold values up to 9999999999999.99
    const sanitizedData: any = { ...screenData }
    
    // For valuation and growth fields with @db.Decimal(8,2), cap at reasonable limits
    const decimal8Fields = [
      'minPE', 'maxPE', 'minPS', 'maxPS', 'minPB', 'maxPB', 'minPCF', 'maxPCF',
      'minROE', 'maxROE', 'minDebtToEquity', 'maxDebtToEquity', 
      'minCurrentRatio', 'maxCurrentRatio', 'minRevenueGrowth', 'maxRevenueGrowth',
      'minEarningsGrowth', 'maxEarningsGrowth', 'minDividendYield', 'maxDividendYield',
      'minMomentum', 'maxMomentum', 'minEarningsSurprise'
    ]
    
    // For market cap and volume with @db.Decimal(15,2), cap at trillion-scale
    const decimal15Fields = [
      'minMarketCap', 'maxMarketCap', 'minVolume', 'maxVolume',
      'allocatedCapital', 'currentCapital'
    ]
    
    decimal8Fields.forEach(field => {
      if (sanitizedData[field] !== undefined && sanitizedData[field] !== null) {
        // Cap at 999999 (max for Decimal(8,2))
        if (sanitizedData[field] > 999999) {
          sanitizedData[field] = 999999
        } else if (sanitizedData[field] < -999999) {
          sanitizedData[field] = -999999
        }
      }
    })
    
    decimal15Fields.forEach(field => {
      if (sanitizedData[field] !== undefined && sanitizedData[field] !== null) {
        // Cap at 9,999,999,999,999 (max for Decimal(15,2))
        if (sanitizedData[field] > 9999999999999) {
          sanitizedData[field] = 9999999999999
        } else if (sanitizedData[field] < -9999999999999) {
          sanitizedData[field] = -9999999999999
        }
      }
    })
    
    console.log('🔧 Sanitized screen data:', JSON.stringify(sanitizedData, null, 2))
    
    // Create the screen
    const screen = await prisma.screen.create({
      data: sanitizedData,
    })
    
    console.log(`✅ Screen created: ${screen.name} (${screen.id})`)
    
    // Add watchlist items for monitored symbols
    if (symbolsToAdd.length > 0) {
      console.log(`📝 CREATING ${symbolsToAdd.length} WATCHLIST ITEMS for screen ${screen.name} (ID: ${screen.id})`)
      console.log(`   All symbols:`, symbolsToAdd)
      
      try {
        // Create the data array
        const watchlistData = symbolsToAdd.map((ticker: string) => ({
          ticker,
          screenId: screen.id,
          score: 0,
          dateAdded: new Date()
        }))
        
        console.log(`   Sample watchlist item data (first item):`, watchlistData[0])
        
        const result = await prisma.watchlistItem.createMany({
          data: watchlistData,
          skipDuplicates: true
        })
        
        console.log(`✅ SUCCESSFULLY CREATED ${result.count} watchlist items for screen ${screen.name}`)
        
        // Verify the items were created
        const verifyCount = await prisma.watchlistItem.count({
          where: { screenId: screen.id }
        })
        console.log(`🔍 VERIFICATION: ${verifyCount} watchlist items found in database for screen ${screen.id}`)
        
        if (verifyCount === 0) {
          console.error(`❌❌❌ CRITICAL BUG: Watchlist items were NOT saved to database despite no errors!`)
          console.error(`   createMany returned count: ${result.count}`)
          console.error(`   Actual count in DB: ${verifyCount}`)
        }
        
      } catch (watchlistError: any) {
        console.error(`❌❌❌ CRITICAL: Failed to create watchlist items:`)
        console.error(`   Error message: ${watchlistError.message}`)
        console.error(`   Error code: ${watchlistError.code}`)
        console.error(`   Error meta:`, watchlistError.meta)
        console.error(`   Full error:`, watchlistError)
        // Don't throw - we still want to return the screen even if watchlist creation fails
        // But this is a CRITICAL bug that needs investigation
      }
    } else {
      console.error(`❌❌❌ CRITICAL: No symbols to add - symbolsToAdd array is EMPTY!`)
      console.error(`   Original monitoredSymbols string: "${monitoredSymbolsStr}"`)
      console.error(`   This means the frontend sent an empty array or parsing failed silently`)
    }

    return NextResponse.json(screen)
  } catch (error: any) {
    console.error('❌ Create screen error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    })
    
    // Check for Prisma unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'Screen name already exists', 
        details: `A screen with the name "${screenName}" already exists. Please choose a different name.` 
      }, { status: 400 })
    }
    
    // Check for Prisma validation errors
    if (error.code === 'P2000') {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: 'One or more field values exceed database limits. Please check your filter values.' 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message || 'An unexpected error occurred' 
    }, { status: 500 })
  }
}
