
#!/bin/bash
# Stop the download watchdog managed by PM2

cd /home/ubuntu/oshaughnessy_trader/nextjs_space

echo "🛑 Stopping download watchdog..."
yarn pm2 stop download-watchdog

echo ""
echo "✅ Watchdog stopped"
echo "📊 Check status: yarn pm2 status"
