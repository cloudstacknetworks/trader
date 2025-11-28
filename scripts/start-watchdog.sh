
#!/bin/bash
# Start the download watchdog using PM2

cd /home/ubuntu/oshaughnessy_trader/nextjs_space

echo "🚀 Starting download watchdog with PM2..."
yarn pm2 start ecosystem.config.js

echo ""
echo "✅ Download watchdog is now managed by PM2"
echo ""
echo "📊 Monitor status:"
echo "   yarn pm2 status"
echo ""
echo "📜 View logs:"
echo "   yarn pm2 logs download-watchdog"
echo ""
echo "🛑 Stop watchdog:"
echo "   yarn pm2 stop download-watchdog"
echo ""
echo "🔄 Restart watchdog:"
echo "   yarn pm2 restart download-watchdog"
echo ""
echo "💡 PM2 will auto-restart on crashes and survive terminal closure"
