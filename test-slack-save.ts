import { prisma } from './lib/db'
import 'dotenv/config'

async function testSlackSave() {
  try {
    console.log('Testing Slack notification save...')
    
    // Get the first user
    const user = await prisma.user.findFirst()
    if (!user) {
      console.error('No users found')
      return
    }
    
    console.log('Found user:', user.email)
    
    // Get their trading account
    const account = await prisma.tradingAccount.findUnique({
      where: { userId: user.id }
    })
    
    if (!account) {
      console.error('No trading account found')
      return
    }
    
    console.log('Current account settings:', {
      slackNotifications: account.slackNotifications,
      slackChannel: account.slackChannel,
      emailNotifications: account.emailNotifications,
      dailySummaryEmail: account.dailySummaryEmail
    })
    
    // Try to update with Slack settings
    const updated = await prisma.tradingAccount.update({
      where: { userId: user.id },
      data: {
        slackNotifications: true,
        slackChannel: '#trading-alerts'
      }
    })
    
    console.log('✅ Update successful!')
    console.log('Updated settings:', {
      slackNotifications: updated.slackNotifications,
      slackChannel: updated.slackChannel
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
  } finally {
    await prisma.$disconnect()
  }
}

testSlackSave()
