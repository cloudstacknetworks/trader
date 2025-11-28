#!/bin/bash
# Setup cron job for daily earnings automation
# Runs at 9:30 AM ET (2:30 PM UTC) on weekdays

PROJECT_DIR="/home/ubuntu/oshaughnessy_trader/nextjs_space"
LOG_DIR="$PROJECT_DIR/logs"
SCRIPT_PATH="$PROJECT_DIR/scripts/check-daily-earnings.ts"
LOG_FILE="$LOG_DIR/daily-earnings.log"

echo "Setting up daily earnings automation cron job..."

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Define the cron job
# 9:30 AM ET = 2:30 PM UTC (during standard time) or 1:30 PM UTC (during daylight saving)
# Using 2:30 PM UTC to be safe during standard time
CRON_JOB="30 14 * * 1-5 cd $PROJECT_DIR && /usr/bin/yarn tsx $SCRIPT_PATH >> $LOG_FILE 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "check-daily-earnings.ts"; then
    echo "⚠️  Cron job already exists. Removing old version..."
    crontab -l | grep -v "check-daily-earnings.ts" | crontab -
fi

# Add new cron job
echo "Adding cron job: Daily earnings check at 9:30 AM ET (weekdays)"
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Cron job installed successfully!"
echo ""
echo "Cron schedule:"
echo "  - Time: 9:30 AM ET (2:30 PM UTC)"
echo "  - Days: Monday - Friday"
echo "  - Log file: $LOG_FILE"
echo ""
echo "To view current cron jobs: crontab -l"
echo "To remove this cron job: crontab -e (then delete the line with 'check-daily-earnings.ts')"
echo "To view logs: tail -f $LOG_FILE"
echo ""
echo "Testing the script now..."
cd "$PROJECT_DIR" && yarn tsx "$SCRIPT_PATH"
