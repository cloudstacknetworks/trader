# End-of-Day Earnings Notifications

## Overview

The News Trader system now sends comprehensive end-of-day (EOD) email notifications when **no stocks pass your earnings screen criteria**. This ensures you stay informed about your monitored stocks even on days with no trading opportunities.

## What's Included in the Notification

When 0 stocks pass your earnings screen threshold, you'll receive an email containing:

### 📊 Summary Statistics
- **Monitored**: Total number of stocks being tracked
- **Reported**: How many stocks reported earnings
- **Pending**: How many stocks have not yet reported

### 📋 Detailed Earnings Table

For each monitored stock, the email shows:

1. **Ticker Symbol** - The stock symbol (e.g., AAPL)
2. **Earnings Date** - When earnings were/will be reported
3. **Estimated EPS** - Analyst consensus estimate
4. **Actual EPS** - Actual reported EPS (if available)
5. **Surprise %** - Percentage difference between actual and estimated
6. **Status Badge** - Visual indicator:
   - 🟢 **✓ Beat (+X%)** - Beat AND met your threshold (would have been traded)
   - 🔵 **Beat (+X%)** - Beat estimates but below your threshold
   - 🔴 **Miss (X%)** - Missed estimates
   - 🟡 **Pending** - Earnings not yet reported
7. **Why Not Traded** - Specific reason:
   - "Below X% surprise threshold"
   - "Earnings not yet reported"
   - "No earnings reported in last 7 days"
   - "Met criteria but not selected (max positions limit)"

## How It Works

### Automatic Daily Process

1. **9:30 AM ET (Weekdays)**: The system runs automatically
2. **Checks Monitored Stocks**: Reviews all stocks in your earnings screens
3. **Evaluates Opportunities**: Determines which stocks beat earnings by your threshold
4. **If 0 Opportunities Found**: Sends detailed EOD email report
5. **If Opportunities Found**: Executes trades (no email sent for this)

### Email Timing

Emails are sent **immediately** at 9:30 AM ET when the daily check runs, if 0 opportunities are found.

### Data Lookback Window

The system checks earnings reported in the **last 7 days** to ensure you don't miss stocks that reported slightly before the daily check.

## Example Scenarios

### Scenario 1: All Stocks Pending
```
Monitored: 18 stocks
Reported: 0
Pending: 18

Result: Email shows all 18 stocks with "Earnings not yet reported"
```

### Scenario 2: Some Reported, None Passed
```
Monitored: 18 stocks
Reported: 5 (beats but below 5% threshold)
Pending: 13

Result: Email shows:
- 5 stocks with actual EPS data and surprise % (e.g., +2.5%)
- Reason: "Below 5% surprise threshold"
- 13 stocks marked "Pending"
```

### Scenario 3: Mixed Results
```
Monitored: 18 stocks
Reported: 8
  - 3 stocks beat by 3% (below 5% threshold)
  - 2 stocks beat by 8% (above 5% threshold, but max positions = 2, so only top 2 traded)
  - 3 stocks missed estimates
Pending: 10

Result: Email shows:
- 3 stocks: "Below 5% surprise threshold"
- 2 stocks: "Met criteria but not selected (max positions limit)"
- 3 stocks: "Miss (X%)"
- 10 stocks: "Pending"
```

## Email Content Preview

The email includes:

### Header
- **Title**: 📊 Earnings Monitor Report
- **Screen Name**: "Wednesday Earnings reports"
- **Date**: Monday, November 25, 2025

### Alert Box
⚠️ **No Trading Opportunities Found**

None of your 18 monitored stocks exceeded the 5% earnings surprise threshold today.

### Action Items
💡 **Next Steps**
- Review your earnings surprise threshold (currently 5%)
- Check if any pending earnings might report later today
- Consider adjusting your monitored stocks list
- The system will automatically trade when opportunities meet your criteria

### Quick Links
- **View Full Report** → Dashboard earnings results page
- **Edit Screen Settings** → Adjust threshold, monitored stocks, max positions

## Configuration

### Enable Email Notifications

1. Go to **Dashboard → Settings**
2. Enable **Email Notifications**
3. Ensure **Automation Enabled** is ON

### Adjust Notification Preferences

You can control whether you receive these emails in **Settings**:
- **Email Notifications** (toggle ON/OFF)
- This setting controls both trade alerts AND no-opportunities emails

### Configure Earnings Screen

1. Go to **Dashboard → Screens** or **Dashboard → Earnings Calendar**
2. Edit your earnings screen:
   - **Min Surprise Threshold** - Adjust the % required (e.g., 3%, 5%, 7%)
   - **Monitored Stocks** - Add/remove tickers
   - **Max Positions** - Control how many trades can be executed

## Technical Details

### Data Sources
- **Earnings Calendar**: Finnhub API (updated daily)
- **Monitored Stocks**: Your watchlist items linked to earnings screens
- **Lookback Period**: 7 days (captures recently reported earnings)

### Notification Logic

```typescript
if (opportunities.length === 0) {
  // Fetch all earnings data for monitored stocks
  // Group by: reported, pending, beat, miss
  // Generate detailed email with table
  // Send to user's registered email
}
```

### Email Delivery
- **Service**: SendGrid
- **Sender**: trading@cloudstacknetworks.com
- **Subject**: `Earnings Monitor: [Screen Name] - No Opportunities (X reported, Y pending)`

## Troubleshooting

### Not Receiving Emails?

1. **Check Email Notifications Setting**
   - Dashboard → Settings → Email Notifications (must be ON)

2. **Check Automation Status**
   - Dashboard → Settings → Automation Enabled (must be ON)

3. **Verify Email Address**
   - Check your account email in settings
   - Look in spam/junk folders

4. **SendGrid API Key**
   - The system requires a configured SendGrid API key
   - This is automatically configured in the production environment

### Email Shows Wrong Data?

- **Earnings data refreshes daily** at 2:00 AM ET
- If stocks report earnings after 9:30 AM, they won't appear until the next day's email
- Check **Dashboard → Earnings Calendar** for real-time updates

### Want to Test the Email?

Run the daily earnings script manually:
```bash
cd /home/ubuntu/oshaughnessy_trader/nextjs_space
yarn tsx scripts/check-daily-earnings.ts
```

This will:
- Process all earnings screens
- Send emails if 0 opportunities found
- Log results to console

## Benefits

✅ **Stay Informed**: Know what your monitored stocks did, even on slow days

✅ **Transparency**: Understand exactly why each stock wasn't traded

✅ **Actionable Insights**: Clear next steps for adjusting your strategy

✅ **Full Audit Trail**: Complete record of all earnings reports

✅ **No Surprises**: Never wonder if the system checked your stocks

## Related Features

- **Trade Notifications**: Real-time alerts when trades are executed
- **Daily Summary**: End-of-day portfolio performance report (4:30 PM ET)
- **Earnings Results Page**: Detailed view of all earnings for a screen
- **In-App Notifications**: Bell icon in dashboard shows all alerts

## FAQ

### Q: Will I get an email every day?
**A**: Only on days when 0 opportunities pass your screen. If the system executes trades, you'll receive trade notifications instead.

### Q: Can I disable these emails but keep trade alerts?
**A**: Currently, Email Notifications controls both. You can request this as a feature to have separate toggles.

### Q: What timezone are the emails sent in?
**A**: 9:30 AM Eastern Time (ET), when US markets open.

### Q: Can I get these on Slack instead?
**A**: Currently, no-opportunities notifications are email-only. Trade alerts and daily summaries support both email and Slack.

### Q: What if a stock reports after 9:30 AM?
**A**: It will be included in the next day's check. The system looks back 7 days, so it won't be missed.

### Q: Why do some stocks show "Met criteria but not selected"?
**A**: Your screen has a **Max Positions** limit. If more stocks pass the threshold than your limit, only the top ones (by surprise %) are traded.

### Q: Can I adjust the 7-day lookback period?
**A**: This is currently hardcoded. Contact support if you need a different window.

## Summary

The EOD earnings notifications provide **complete transparency** into your automated earnings trading strategy. You'll never wonder if the system checked your stocks or why a trade wasn't executed. Every monitored stock is accounted for with clear explanations and actionable next steps.

---

**Version**: 2025.11.25.11  
**Last Updated**: November 25, 2025  
**Feature**: EOD No-Opportunities Earnings Notifications
