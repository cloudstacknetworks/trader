
/**
 * Notification Service - Handles email, Slack, and in-app notifications for trades
 */

import { prisma } from '@/lib/db'
import fs from 'fs'

// Load secrets from auth_secrets.json at runtime only
function loadAuthSecrets() {
  // Only load secrets at runtime, not during build
  if (typeof window !== 'undefined') {
    return {}
  }
  
  try {
    // Use environment variable or default path
    const secretsPath = process.env.AUTH_SECRETS_PATH || `${process.env.HOME}/.config/abacusai_auth_secrets.json`
    if (!fs.existsSync(secretsPath)) {
      console.warn('Auth secrets file not found at:', secretsPath)
      return {}
    }
    const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'))
    return secrets
  } catch (error) {
    console.error('Failed to load auth secrets:', error)
    return {}
  }
}

interface TradeNotificationData {
  userId: string
  ticker: string
  action: 'BUY' | 'SELL'
  quantity: number
  price: number
  reason?: string
  pnl?: number
  entryPrice?: number
}

interface DailySummaryData {
  userId: string
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalPnl: number
  openPositions: number
  closedPositions: number
  topPerformer?: { ticker: string; pnl: number }
  worstPerformer?: { ticker: string; pnl: number }
}

interface EarningsMonitorData {
  ticker: string
  earningsDate: Date | null
  estimatedEPS: number | null
  actualEPS: number | null
  surprise: number | null
  passedScreen: boolean
  reason?: string
}

interface NoEarningsOpportunitiesData {
  userId: string
  userEmail: string
  screenName: string
  screenId: string
  monitoredStocks: EarningsMonitorData[]
  minSurpriseThreshold: number
  date: Date
}

export class NotificationService {
  private sendGridApiKey: string | null = null
  private slackAccessToken: string | null = null
  private secretsLoaded: boolean = false

  private loadSecrets() {
    if (this.secretsLoaded) return
    
    // Load SendGrid API key and Slack token
    const authSecrets = loadAuthSecrets()
    this.sendGridApiKey = authSecrets?.['sendgrid']?.['secrets']?.['api_key']?.['value'] || null
    this.slackAccessToken = authSecrets?.['slack']?.['secrets']?.['access_token']?.['value'] || null
    this.secretsLoaded = true
  }

  /**
   * Send trade notification via all enabled channels
   */
  async sendTradeNotification(data: TradeNotificationData) {
    this.loadSecrets()
    
    try {
      // Get user preferences
      const account = await prisma.tradingAccount.findUnique({
        where: { userId: data.userId },
        include: { user: true }
      })

      if (!account) {
        console.error('Trading account not found for user:', data.userId)
        return
      }

      // Create in-app notification
      const notif = await this.createInAppNotification(data)

      // Send email if enabled
      if (account.emailNotifications && this.sendGridApiKey) {
        await this.sendTradeEmail(account.user.email, data)
        await prisma.notification.update({
          where: { id: notif.id },
          data: { emailSent: true }
        })
      }

      // Send Slack message if enabled
      if (account.slackNotifications && this.slackAccessToken && account.slackChannel) {
        await this.sendSlackMessage(account.slackChannel, data)
        await prisma.notification.update({
          where: { id: notif.id },
          data: { slackSent: true }
        })
      }
    } catch (error) {
      console.error('Error sending trade notification:', error)
    }
  }

  /**
   * Create in-app notification record
   */
  private async createInAppNotification(data: TradeNotificationData) {
    const isBuy = data.action === 'BUY'
    const title = isBuy ? `📈 Bought ${data.ticker}` : `📉 Sold ${data.ticker}`
    
    let message = `${data.action} ${data.quantity} shares at $${data.price.toFixed(2)}`
    if (!isBuy && data.pnl !== undefined) {
      const pnlPrefix = data.pnl >= 0 ? '+' : ''
      message += ` • P&L: ${pnlPrefix}$${data.pnl.toFixed(2)}`
    }
    if (data.reason) {
      message += ` • Reason: ${data.reason}`
    }

    return await prisma.notification.create({
      data: {
        userId: data.userId,
        type: isBuy ? 'TRADE_BUY' : 'TRADE_SELL',
        title,
        message,
        ticker: data.ticker,
        action: data.action,
        quantity: data.quantity,
        price: data.price,
        pnl: data.pnl || null
      }
    })
  }

  /**
   * Send email notification via SendGrid
   */
  private async sendTradeEmail(email: string, data: TradeNotificationData) {
    if (!this.sendGridApiKey) {
      console.warn('SendGrid API key not configured')
      return
    }

    const isBuy = data.action === 'BUY'
    const subject = `Trade Alert: ${data.action} ${data.ticker}`
    
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${isBuy ? '#10b981' : '#ef4444'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">${isBuy ? '📈' : '📉'} ${data.action} ${data.ticker}</h2>
        </div>
        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; font-weight: bold;">Symbol:</td>
              <td style="padding: 10px;">${data.ticker}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Action:</td>
              <td style="padding: 10px;">${data.action}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Quantity:</td>
              <td style="padding: 10px;">${data.quantity} shares</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Price:</td>
              <td style="padding: 10px;">$${data.price.toFixed(2)}</td>
            </tr>
    `

    if (!isBuy && data.entryPrice) {
      html += `
            <tr>
              <td style="padding: 10px; font-weight: bold;">Entry Price:</td>
              <td style="padding: 10px;">$${data.entryPrice.toFixed(2)}</td>
            </tr>
      `
    }

    if (!isBuy && data.pnl !== undefined) {
      const pnlColor = data.pnl >= 0 ? '#10b981' : '#ef4444'
      html += `
            <tr>
              <td style="padding: 10px; font-weight: bold;">P&L:</td>
              <td style="padding: 10px; color: ${pnlColor}; font-weight: bold;">
                ${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)}
              </td>
            </tr>
      `
    }

    if (data.reason) {
      html += `
            <tr>
              <td style="padding: 10px; font-weight: bold;">Reason:</td>
              <td style="padding: 10px;">${data.reason}</td>
            </tr>
      `
    }

    html += `
          </table>
          <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
            This is an automated notification from News Trader. 
            <a href="https://trader.cloudstacknetworks.com/dashboard/settings" style="color: #3b82f6;">Manage notification preferences</a>
          </p>
        </div>
      </div>
    `

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: 'trading@cloudstacknetworks.com', name: 'News Trader' },
          subject,
          content: [{ type: 'text/html', value: html }]
        })
      })

      if (!response.ok) {
        throw new Error(`SendGrid API error: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to send trade email:', error)
    }
  }

  /**
   * Send Slack message notification
   */
  private async sendSlackMessage(channel: string, data: TradeNotificationData) {
    if (!this.slackAccessToken) {
      console.warn('Slack access token not configured')
      return
    }

    const isBuy = data.action === 'BUY'
    const color = isBuy ? '#10b981' : '#ef4444'
    const emoji = isBuy ? '📈' : '📉'
    
    let text = `${emoji} *${data.action} ${data.ticker}*\n`
    text += `• Quantity: ${data.quantity} shares\n`
    text += `• Price: $${data.price.toFixed(2)}\n`
    
    if (!isBuy && data.entryPrice) {
      text += `• Entry Price: $${data.entryPrice.toFixed(2)}\n`
    }
    
    if (!isBuy && data.pnl !== undefined) {
      text += `• P&L: ${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)}\n`
    }
    
    if (data.reason) {
      text += `• Reason: ${data.reason}`
    }

    try {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.slackAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel,
          text,
          attachments: [{
            color,
            footer: 'News Trader • CloudStack Networks',
            ts: Math.floor(Date.now() / 1000)
          }]
        })
      })

      const result = await response.json()
      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to send Slack message:', error)
    }
  }

  /**
   * Send daily summary notification
   */
  async sendDailySummary(data: DailySummaryData) {
    this.loadSecrets()
    
    try {
      const account = await prisma.tradingAccount.findUnique({
        where: { userId: data.userId },
        include: { user: true }
      })

      if (!account || !account.dailySummaryEmail) {
        return
      }

      const winRate = data.totalTrades > 0 
        ? ((data.winningTrades / data.totalTrades) * 100).toFixed(1)
        : '0.0'

      // Create in-app notification
      await prisma.notification.create({
        data: {
          userId: data.userId,
          type: 'DAILY_SUMMARY',
          title: '📊 Daily Trading Summary',
          message: `${data.totalTrades} trades • ${winRate}% win rate • ${data.totalPnl >= 0 ? '+' : ''}$${data.totalPnl.toFixed(2)} P&L`
        }
      })

      // Send email if enabled
      if (account.emailNotifications && this.sendGridApiKey) {
        await this.sendDailySummaryEmail(account.user.email, data, winRate)
      }

      // Send Slack message if enabled
      if (account.slackNotifications && this.slackAccessToken && account.slackChannel) {
        await this.sendDailySummarySlack(account.slackChannel, data, winRate)
      }
    } catch (error) {
      console.error('Error sending daily summary:', error)
    }
  }

  /**
   * Send daily summary email
   */
  private async sendDailySummaryEmail(email: string, data: DailySummaryData, winRate: string) {
    if (!this.sendGridApiKey) return

    const pnlColor = data.totalPnl >= 0 ? '#10b981' : '#ef4444'
    const pnlPrefix = data.totalPnl >= 0 ? '+' : ''

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📊 Daily Trading Summary</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">Total Trades</div>
              <div style="font-size: 32px; font-weight: bold;">${data.totalTrades}</div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">Win Rate</div>
              <div style="font-size: 32px; font-weight: bold; color: #10b981;">${winRate}%</div>
            </div>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px;">
            <div style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">Total P&L</div>
            <div style="font-size: 36px; font-weight: bold; color: ${pnlColor};">${pnlPrefix}$${data.totalPnl.toFixed(2)}</div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="color: #6b7280; font-size: 12px;">Winning Trades</div>
              <div style="font-size: 20px; font-weight: bold; color: #10b981;">${data.winningTrades}</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="color: #6b7280; font-size: 12px;">Losing Trades</div>
              <div style="font-size: 20px; font-weight: bold; color: #ef4444;">${data.losingTrades}</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="color: #6b7280; font-size: 12px;">Open Positions</div>
              <div style="font-size: 20px; font-weight: bold;">${data.openPositions}</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="color: #6b7280; font-size: 12px;">Closed Today</div>
              <div style="font-size: 20px; font-weight: bold;">${data.closedPositions}</div>
            </div>
          </div>

          ${data.topPerformer ? `
          <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #10b981;">
            <div style="color: #065f46; font-size: 12px; font-weight: bold; margin-bottom: 5px;">🏆 TOP PERFORMER</div>
            <div style="color: #047857; font-size: 18px; font-weight: bold;">
              ${data.topPerformer.ticker} • +$${data.topPerformer.pnl.toFixed(2)}
            </div>
          </div>
          ` : ''}

          ${data.worstPerformer && data.worstPerformer.pnl < 0 ? `
          <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin-top: 10px; border-left: 4px solid #ef4444;">
            <div style="color: #991b1b; font-size: 12px; font-weight: bold; margin-bottom: 5px;">📉 WORST PERFORMER</div>
            <div style="color: #dc2626; font-size: 18px; font-weight: bold;">
              ${data.worstPerformer.ticker} • $${data.worstPerformer.pnl.toFixed(2)}
            </div>
          </div>
          ` : ''}

          <div style="margin-top: 30px; text-align: center;">
            <a href="https://trader.cloudstacknetworks.com/dashboard/trades" 
               style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; 
                      border-radius: 6px; text-decoration: none; font-weight: bold;">
              View Full Trade History
            </a>
          </div>

          <p style="margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center;">
            News Trader • CloudStack Networks<br>
            <a href="https://trader.cloudstacknetworks.com/dashboard/settings" style="color: #3b82f6;">Manage notification preferences</a>
          </p>
        </div>
      </div>
    `

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: 'trading@cloudstacknetworks.com', name: 'News Trader' },
          subject: `Daily Summary: ${pnlPrefix}$${data.totalPnl.toFixed(2)} • ${data.totalTrades} trades`,
          content: [{ type: 'text/html', value: html }]
        })
      })

      if (!response.ok) {
        throw new Error(`SendGrid API error: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to send daily summary email:', error)
    }
  }

  /**
   * Send daily summary Slack message
   */
  private async sendDailySummarySlack(channel: string, data: DailySummaryData, winRate: string) {
    if (!this.slackAccessToken) return

    const pnlPrefix = data.totalPnl >= 0 ? '+' : ''
    const pnlEmoji = data.totalPnl >= 0 ? '💰' : '📉'

    let text = `📊 *Daily Trading Summary*\n\n`
    text += `${pnlEmoji} *Total P&L:* ${pnlPrefix}$${data.totalPnl.toFixed(2)}\n`
    text += `📈 *Total Trades:* ${data.totalTrades}\n`
    text += `✅ *Win Rate:* ${winRate}%\n`
    text += `🟢 *Winning:* ${data.winningTrades} | 🔴 *Losing:* ${data.losingTrades}\n`
    text += `📊 *Open:* ${data.openPositions} | ✔️ *Closed Today:* ${data.closedPositions}\n`

    if (data.topPerformer) {
      text += `\n🏆 *Top Performer:* ${data.topPerformer.ticker} (+$${data.topPerformer.pnl.toFixed(2)})`
    }

    if (data.worstPerformer && data.worstPerformer.pnl < 0) {
      text += `\n📉 *Worst Performer:* ${data.worstPerformer.ticker} ($${data.worstPerformer.pnl.toFixed(2)})`
    }

    try {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.slackAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel,
          text,
          attachments: [{
            color: data.totalPnl >= 0 ? '#10b981' : '#ef4444',
            footer: `News Trader • ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
            ts: Math.floor(Date.now() / 1000)
          }]
        })
      })

      const result = await response.json()
      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to send daily summary to Slack:', error)
    }
  }

  /**
   * Send no earnings opportunities notification
   */
  async sendNoEarningsOpportunities(data: NoEarningsOpportunitiesData) {
    this.loadSecrets()
    
    try {
      const account = await prisma.tradingAccount.findUnique({
        where: { userId: data.userId },
        include: { user: true }
      })

      if (!account || !account.emailNotifications) {
        return
      }

      // Send email notification
      if (this.sendGridApiKey) {
        await this.sendNoEarningsOpportunitiesEmail(data)
      }

      // Create in-app notification
      await prisma.notification.create({
        data: {
          userId: data.userId,
          type: 'DAILY_SUMMARY',
          title: `📊 ${data.screenName} - No Opportunities Today`,
          message: `Monitored ${data.monitoredStocks.length} stocks. None exceeded ${data.minSurpriseThreshold}% earnings surprise threshold.`
        }
      })
    } catch (error) {
      console.error('Error sending no earnings opportunities notification:', error)
    }
  }

  /**
   * Send no earnings opportunities email
   */
  private async sendNoEarningsOpportunitiesEmail(data: NoEarningsOpportunitiesData) {
    if (!this.sendGridApiKey) return

    // Group stocks by status
    const reported = data.monitoredStocks.filter(s => s.actualEPS !== null)
    const pending = data.monitoredStocks.filter(s => s.actualEPS === null)

    // Generate stock rows HTML
    const stockRowsHTML = data.monitoredStocks.map(stock => {
      let statusBadge = ''
      let statusColor = '#6b7280'
      
      if (stock.actualEPS === null) {
        statusBadge = 'Pending'
        statusColor = '#f59e0b'
      } else if (stock.surprise !== null) {
        if (stock.surprise >= data.minSurpriseThreshold) {
          statusBadge = `✓ Beat (+${stock.surprise.toFixed(1)}%)`
          statusColor = '#10b981'
        } else if (stock.surprise > 0) {
          statusBadge = `Beat (+${stock.surprise.toFixed(1)}%)`
          statusColor = '#3b82f6'
        } else {
          statusBadge = `Miss (${stock.surprise.toFixed(1)}%)`
          statusColor = '#ef4444'
        }
      } else {
        statusBadge = 'Reported'
        statusColor = '#6b7280'
      }

      const reason = stock.reason || (stock.surprise !== null && stock.surprise < data.minSurpriseThreshold 
        ? `Below ${data.minSurpriseThreshold}% threshold` 
        : 'N/A')

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 8px; font-weight: bold;">${stock.ticker}</td>
          <td style="padding: 12px 8px;">${stock.earningsDate ? new Date(stock.earningsDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}</td>
          <td style="padding: 12px 8px; text-align: center;">${stock.estimatedEPS !== null ? '$' + stock.estimatedEPS.toFixed(2) : 'N/A'}</td>
          <td style="padding: 12px 8px; text-align: center;">${stock.actualEPS !== null ? '$' + stock.actualEPS.toFixed(2) : '-'}</td>
          <td style="padding: 12px 8px; text-align: center;">${stock.surprise !== null ? stock.surprise.toFixed(1) + '%' : '-'}</td>
          <td style="padding: 12px 8px;">
            <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; 
                         background: ${statusColor}20; color: ${statusColor};">
              ${statusBadge}
            </span>
          </td>
          <td style="padding: 12px 8px; font-size: 13px; color: #6b7280;">${reason}</td>
        </tr>
      `
    }).join('')

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📊 Earnings Monitor Report</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${data.screenName}</p>
          <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">${data.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <div style="color: #92400e; font-weight: bold; margin-bottom: 8px;">⚠️ No Trading Opportunities Found</div>
            <div style="color: #78350f; font-size: 14px;">
              None of your ${data.monitoredStocks.length} monitored stocks exceeded the ${data.minSurpriseThreshold}% earnings surprise threshold today.
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">Monitored</div>
              <div style="font-size: 28px; font-weight: bold; color: #3b82f6;">${data.monitoredStocks.length}</div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">Reported</div>
              <div style="font-size: 28px; font-weight: bold; color: #10b981;">${reported.length}</div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">Pending</div>
              <div style="font-size: 28px; font-weight: bold; color: #f59e0b;">${pending.length}</div>
            </div>
          </div>

          <div style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">Earnings Details</h2>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                  <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                    <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151;">Ticker</th>
                    <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151;">Date</th>
                    <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151;">Est. EPS</th>
                    <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151;">Actual EPS</th>
                    <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151;">Surprise</th>
                    <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151;">Status</th>
                    <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151;">Why Not Traded</th>
                  </tr>
                </thead>
                <tbody>
                  ${stockRowsHTML}
                </tbody>
              </table>
            </div>
          </div>

          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <div style="color: #1e40af; font-weight: bold; margin-bottom: 8px;">💡 Next Steps</div>
            <div style="color: #1e3a8a; font-size: 14px;">
              • Review your earnings surprise threshold (currently ${data.minSurpriseThreshold}%)<br>
              • Check if any pending earnings might report later today<br>
              • Consider adjusting your monitored stocks list<br>
              • The system will automatically trade when opportunities meet your criteria
            </div>
          </div>

          <div style="margin-top: 30px; text-align: center;">
            <a href="https://trader.cloudstacknetworks.com/dashboard/earnings-results/${data.screenId}" 
               style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; 
                      border-radius: 6px; text-decoration: none; font-weight: bold; margin-right: 10px;">
              View Full Report
            </a>
            <a href="https://trader.cloudstacknetworks.com/dashboard/screens" 
               style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; 
                      border-radius: 6px; text-decoration: none; font-weight: bold;">
              Edit Screen Settings
            </a>
          </div>

          <p style="margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center;">
            News Trader • CloudStack Networks<br>
            This is an automated daily earnings monitor report.<br>
            <a href="https://trader.cloudstacknetworks.com/dashboard/settings" style="color: #3b82f6;">Manage notification preferences</a>
          </p>
        </div>
      </div>
    `

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: data.userEmail }] }],
          from: { email: 'trading@cloudstacknetworks.com', name: 'News Trader' },
          subject: `Earnings Monitor: ${data.screenName} - No Opportunities (${reported.length} reported, ${pending.length} pending)`,
          content: [{ type: 'text/html', value: html }]
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`SendGrid API error: ${response.status} - ${errorText}`)
      }
      
      console.log(`✅ Sent no-opportunities email to ${data.userEmail} for screen "${data.screenName}"`)
    } catch (error) {
      console.error('Failed to send no earnings opportunities email:', error)
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
