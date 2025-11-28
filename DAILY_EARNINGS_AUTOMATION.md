# Daily Earnings Automation Setup

## Overview

The daily earnings automation system automatically checks for earnings beats and executes trades every weekday at **9:30 AM ET** (market open).

## How It Works

1. **Script**: `scripts/check-daily-earnings.ts`
2. **Schedule**: Weekdays at 9:30 AM ET (2:30 PM UTC)
3. **Trigger**: Automated via cron job

### Workflow

```
9:30 AM ET (Market Open)
        |
        v
  Find Active EARNINGS Screens
        |
        v
  Find Users with Automation Enabled
        |
        v
  For Each Screen × User Combination:
        |
        v
  Check if monitored stocks beat estimates
        |
        v
  Execute trades for qualified opportunities
        |
        v
  Send notifications (email/Slack/in-app)
        |
        v
  Log results to logs/daily-earnings.log
```

## Installation

### Option 1: Automated Setup (Recommended)

```bash
cd /home/ubuntu/oshaughnessy_trader/nextjs_space
chmod +x scripts/setup-daily-earnings-cron.sh
./scripts/setup-daily-earnings-cron.sh
```

This script will:
- Create the logs directory
- Install the cron job
- Test the script immediately

### Option 2: Manual Setup

1. Open crontab editor:
   ```bash
   crontab -e
   ```

2. Add this line:
   ```
   30 14 * * 1-5 cd /home/ubuntu/oshaughnessy_trader/nextjs_space && /usr/bin/yarn tsx scripts/check-daily-earnings.ts >> logs/daily-earnings.log 2>&1
   ```

3. Save and exit

## Monitoring

### View Logs

```bash
# Real-time log monitoring
tail -f /home/ubuntu/oshaughnessy_trader/nextjs_space/logs/daily-earnings.log

# Last 50 lines
tail -n 50 /home/ubuntu/oshaughnessy_trader/nextjs_space/logs/daily-earnings.log

# Search for errors
grep "ERROR\|❌" /home/ubuntu/oshaughnessy_trader/nextjs_space/logs/daily-earnings.log
```

### Manual Test Run

```bash
cd /home/ubuntu/oshaughnessy_trader/nextjs_space
yarn tsx scripts/check-daily-earnings.ts
```

### Check Cron Status

```bash
# View all cron jobs
crontab -l

# Check if cron service is running
systemctl status cron
```

## Configuration

### User Requirements

For the automation to work for a user:

1. **Automation Enabled**: User must have `automationEnabled: true` in their `TradingAccount`
2. **Active Screen**: At least one `EARNINGS` screen must be active (`isActive: true`)
3. **Monitored Stocks**: The screen must have stocks in its watchlist
4. **Alpaca Credentials**: Valid Alpaca API keys configured

### Screen Configuration

Each earnings screen can be configured with:

- **`minEarningsSurprise`**: Minimum earnings beat % (e.g., 5% means stock must beat estimates by at least 5%)
- **`maxPositions`**: Maximum number of positions to open per day for this screen (default: 10)
- **Monitored Symbols**: List of stocks to watch in the screen's watchlist

## Troubleshooting

### No Trades Being Executed

**Check:**

1. Are any monitored stocks reporting earnings today?
   ```bash
   yarn tsx check_tomorrow_earnings.ts
   ```

2. Did any stocks beat estimates by the required threshold?
   ```bash
   yarn tsx show_earnings_results.ts "Your Screen Name" 1
   ```

3. Is automation enabled for your account?
   - Go to Dashboard → Settings → Automation
   - Ensure "Enable Automated Trading" is ON

4. Are the monitored stocks overlapping with today's earnings?
   - Your screen monitors specific stocks
   - Only those stocks will trigger trades

### Script Errors

**Check logs:**
```bash
tail -f logs/daily-earnings.log
```

**Common issues:**

- **Database connection**: Ensure `DATABASE_URL` is set in `.env`
- **API credentials**: Verify Alpaca keys are valid
- **Permissions**: Ensure script is executable (`chmod +x scripts/check-daily-earnings.ts`)

### Cron Not Running

**Verify cron job:**
```bash
crontab -l | grep check-daily-earnings
```

**Check cron service:**
```bash
sudo systemctl status cron
sudo systemctl restart cron
```

**Check system time:**
```bash
date
timedatectl
```

## Disabling Automation

### For All Users (Remove Cron Job)

```bash
crontab -e
# Delete the line containing 'check-daily-earnings.ts'
# Save and exit
```

### For Individual Users

1. Go to Dashboard → Settings → Automation
2. Toggle off "Enable Automated Trading"
3. Save settings

## Log Format

```
============================================================
Daily Earnings Check - 11/25/2025, 9:30:00 AM ET
============================================================

Found 2 active earnings screens
Found 50 users with automation enabled

Processing: "Wednesday Earnings reports"
  - Monitored stocks: 18
  - Min surprise threshold: 5%
  - Max positions: 10
  - Running for 50 users with automation enabled

  User: john@doe.com
    ✅ Found 3 qualified opportunities
       1. AAPL - Surprise: +7.25%
       2. TSLA - Surprise: +5.50%
       3. NVDA - Surprise: +6.10%

============================================================
SUMMARY
============================================================
Screens processed: 2
Total opportunities found: 150
Total trades executed: 150
Errors: 0
Duration: 2.45s
============================================================
```

## Performance

- **Execution time**: ~0.3-3 seconds (depends on number of screens × users)
- **Database queries**: Optimized with selective fetches
- **API calls**: Only for stocks with actual earnings reports
- **Notifications**: Sent asynchronously for all enabled channels

## Next Steps

1. **Create your first earnings screen**:
   - Go to Dashboard → Earnings Calendar
   - Click "Create Earnings Monitor"
   - Select stocks and set your surprise threshold

2. **Enable automation**:
   - Go to Dashboard → Settings → Automation
   - Toggle on "Enable Automated Trading"
   - Configure notification preferences

3. **Monitor activity**:
   - Check logs daily: `tail -f logs/daily-earnings.log`
   - Review trades: Dashboard → Trades
   - View positions: Dashboard → Positions

## FAQ

**Q: What time zone is used?**  
A: Eastern Time (ET). The script runs at 9:30 AM ET, which is when US markets open.

**Q: What happens on weekends/holidays?**  
A: The cron job only runs Monday-Friday. If markets are closed due to a holiday, no trades will execute even if the script runs.

**Q: Can I run multiple screens?**  
A: Yes! The system processes all active EARNINGS screens for all users with automation enabled.

**Q: How are trades prioritized if there are more opportunities than max positions?**  
A: Opportunities are sorted by earnings surprise % (highest first), and the top N are traded, where N = min(screen.maxPositions, account.maxPositions).

**Q: Can I test without real money?**  
A: Yes! Enable "Paper Trading Mode" in Settings → Trading Account. This uses Alpaca's paper trading environment.

---

**Last Updated**: November 25, 2025  
**Version**: 1.0.0  
**Related**: `/scripts/check-daily-earnings.ts`, `/lib/trading-engine.ts`
