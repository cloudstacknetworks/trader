
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Configuration
const CONFIG = {
  CHECK_INTERVAL_MS: 5 * 60 * 1000, // Check every 5 minutes
  STALL_THRESHOLD_MS: 15 * 60 * 1000, // Consider stalled if no progress for 15 minutes
  MAX_RESTART_ATTEMPTS: 5, // Maximum restart attempts before giving up
  RESTART_COOLDOWN_MS: 2 * 60 * 1000, // Wait 2 minutes between restart attempts
  LOG_FILE: path.join(process.cwd(), 'watchdog.log'),
  DOWNLOAD_LOG_FILE: path.join(process.cwd(), 'alpaca-download.log'),
}

let restartAttempts = 0
let lastRestartTime = 0
let downloadProcessPid: number | null = null

/**
 * Log message to console and file
 */
function log(message: string) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}`
  console.log(logMessage)
  fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n')
}

/**
 * Check if download process is running
 */
function isDownloadProcessRunning(): boolean {
  try {
    const { execSync } = require('child_process')
    const result = execSync('ps aux | grep download-alpaca-stocks | grep -v grep || true').toString()
    return result.trim().length > 0
  } catch (error) {
    return false
  }
}

/**
 * Get last database update time
 */
async function getLastUpdateTime(): Promise<Date | null> {
  try {
    const newest = await prisma.stockData.findFirst({
      orderBy: { lastUpdated: 'desc' },
      select: { lastUpdated: true }
    })
    return newest?.lastUpdated || null
  } catch (error) {
    log(`❌ Error checking last update time: ${error}`)
    return null
  }
}

/**
 * Check if download is stalled
 */
async function isDownloadStalled(): Promise<boolean> {
  const lastUpdate = await getLastUpdateTime()
  if (!lastUpdate) {
    log('⚠️  No stocks found in database - considering as active initial download')
    return false
  }

  const timeSinceLastUpdate = Date.now() - lastUpdate.getTime()
  const isStalled = timeSinceLastUpdate > CONFIG.STALL_THRESHOLD_MS

  if (isStalled) {
    log(`🔴 Download STALLED - No updates for ${Math.round(timeSinceLastUpdate / 60000)} minutes`)
  }

  return isStalled
}

/**
 * Check if there's an active RUNNING log
 */
async function hasActiveRunningLog(): Promise<boolean> {
  try {
    const runningLog = await prisma.dataRefreshLog.findFirst({
      where: { status: 'RUNNING' }
    })
    return !!runningLog
  } catch (error) {
    log(`❌ Error checking running logs: ${error}`)
    return false
  }
}

/**
 * Clean up stuck RUNNING logs
 */
async function cleanupStuckLogs(): Promise<number> {
  try {
    const result = await prisma.dataRefreshLog.updateMany({
      where: { status: 'RUNNING' },
      data: {
        status: 'FAILED',
        endTime: new Date(),
        errorMessage: 'Process stalled - cleaned up by watchdog'
      }
    })
    if (result.count > 0) {
      log(`✅ Cleaned up ${result.count} stuck RUNNING logs`)
    }
    return result.count
  } catch (error) {
    log(`❌ Error cleaning up stuck logs: ${error}`)
    return 0
  }
}

/**
 * Kill existing download process if running
 */
function killDownloadProcess() {
  try {
    const { execSync } = require('child_process')
    execSync('pkill -f download-alpaca-stocks || true')
    log('✅ Killed existing download process')
  } catch (error) {
    log(`⚠️  Error killing process: ${error}`)
  }
}

/**
 * Start download process
 */
function startDownloadProcess(): boolean {
  try {
    log('🚀 Starting download process...')
    
    // Kill any existing process first
    killDownloadProcess()
    
    // Wait a moment for cleanup
    const { execSync } = require('child_process')
    execSync('sleep 2')
    
    // Start new process
    const downloadScript = path.join(process.cwd(), 'scripts', 'download-alpaca-stocks.ts')
    const child = spawn(
      'node',
      [
        './node_modules/.bin/tsx',
        downloadScript
      ],
      {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: process.cwd()
      }
    )

    // Redirect output to log file
    const logStream = fs.createWriteStream(CONFIG.DOWNLOAD_LOG_FILE, { flags: 'a' })
    child.stdout?.pipe(logStream)
    child.stderr?.pipe(logStream)

    child.unref()
    downloadProcessPid = child.pid || null

    log(`✅ Download process started (PID: ${downloadProcessPid})`)
    return true
  } catch (error) {
    log(`❌ Error starting download process: ${error}`)
    return false
  }
}

/**
 * Restart download process with exponential backoff
 */
async function restartDownload(): Promise<boolean> {
  const now = Date.now()
  
  // Check restart cooldown
  if (now - lastRestartTime < CONFIG.RESTART_COOLDOWN_MS) {
    const waitTime = Math.round((CONFIG.RESTART_COOLDOWN_MS - (now - lastRestartTime)) / 1000)
    log(`⏳ Cooldown period - waiting ${waitTime}s before restart`)
    return false
  }

  // Check restart attempts
  if (restartAttempts >= CONFIG.MAX_RESTART_ATTEMPTS) {
    log(`🛑 Maximum restart attempts (${CONFIG.MAX_RESTART_ATTEMPTS}) reached - giving up`)
    log('💡 Manual intervention required - check system logs and restart manually')
    return false
  }

  restartAttempts++
  lastRestartTime = now

  log(`🔄 Restart attempt ${restartAttempts}/${CONFIG.MAX_RESTART_ATTEMPTS}`)

  // Cleanup stuck logs
  await cleanupStuckLogs()

  // Start download
  const success = startDownloadProcess()

  if (success) {
    log('✅ Download restart successful')
  } else {
    log('❌ Download restart failed')
  }

  return success
}

/**
 * Check database completion percentage
 */
async function getDatabaseCompletion(): Promise<{ count: number; percent: number }> {
  try {
    const count = await prisma.stockData.count()
    const EXPECTED_UNIVERSE = 12260
    const percent = Math.round((count / EXPECTED_UNIVERSE) * 100)
    return { count, percent }
  } catch (error) {
    log(`❌ Error checking database completion: ${error}`)
    return { count: 0, percent: 0 }
  }
}

/**
 * Main health check routine
 */
async function performHealthCheck() {
  log('🔍 Performing health check...')

  try {
    // Get database stats
    const { count, percent } = await getDatabaseCompletion()
    log(`📊 Database: ${count} stocks (${percent}% of 12,260)`)

    // Check if download is complete
    if (percent >= 95) {
      log('✅ Download is complete (≥95%) - shutting down watchdog')
      process.exit(0)
    }

    // Check if process is running
    const processRunning = isDownloadProcessRunning()
    log(`⚙️  Download process: ${processRunning ? 'RUNNING' : 'NOT RUNNING'}`)

    // Check if download is stalled
    const isStalled = await isDownloadStalled()

    // Check for active running log
    const hasRunningLog = await hasActiveRunningLog()
    log(`📋 Active RUNNING log: ${hasRunningLog ? 'YES' : 'NO'}`)

    // Decision logic
    if (!processRunning && hasRunningLog) {
      log('🔴 PROBLEM: Process not running but has RUNNING log - process crashed')
      await restartDownload()
    } else if (processRunning && isStalled) {
      log('🔴 PROBLEM: Process running but stalled - restarting')
      await restartDownload()
    } else if (!processRunning && !hasRunningLog) {
      log('⚠️  No active download - starting fresh')
      await restartDownload()
    } else {
      log('✅ Download is healthy')
      // Reset restart counter on successful check
      restartAttempts = 0
    }

  } catch (error) {
    log(`❌ Error during health check: ${error}`)
  }

  log('') // Empty line for readability
}

/**
 * Main watchdog loop
 */
async function main() {
  log('🐕 Download Watchdog started')
  log(`📍 Check interval: ${CONFIG.CHECK_INTERVAL_MS / 1000}s`)
  log(`⏱️  Stall threshold: ${CONFIG.STALL_THRESHOLD_MS / 60000} minutes`)
  log(`🔄 Max restart attempts: ${CONFIG.MAX_RESTART_ATTEMPTS}`)
  log('')

  // Perform initial health check immediately
  await performHealthCheck()

  // Schedule regular health checks
  setInterval(async () => {
    await performHealthCheck()
  }, CONFIG.CHECK_INTERVAL_MS)
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  log('🛑 Watchdog shutting down...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  log('🛑 Watchdog shutting down...')
  await prisma.$disconnect()
  process.exit(0)
})

// Start watchdog
main()
