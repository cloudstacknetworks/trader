#!/bin/bash

# Vercel Deploy Hook Script
# Triggers deployment using Vercel's Deploy Hook

set -e

DEPLOY_HOOK_URL="https://api.vercel.com/v1/integrations/deploy/prj_sPJmTeBWx4XneNWv33V7erhb3DHO/71OI5fHDGG"

echo "=========================================="
echo "   Triggering Vercel Deployment"
echo "=========================================="
echo ""
echo "📦 Sending deployment request to Vercel..."
echo ""

# Trigger the deploy hook
RESPONSE=$(curl -s -X POST "$DEPLOY_HOOK_URL")

# Check if response contains "job" (indicates success)
if echo "$RESPONSE" | grep -q '"job"'; then
    echo "✅ Deployment triggered successfully!"
    echo ""
    echo "📊 Response from Vercel:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "🔍 Next steps:"
    echo "   1. Go to your Vercel Dashboard"
    echo "   2. Click on 'Deployments' tab"
    echo "   3. Watch the build progress in real-time"
    echo "   4. Build should complete in 5-6 minutes"
    echo ""
    echo "🔗 Dashboard: https://vercel.com/dashboard"
else
    echo "❌ Deployment trigger failed!"
    echo ""
    echo "Response from Vercel:"
    echo "$RESPONSE"
    echo ""
    echo "Troubleshooting:"
    echo "   - Check if the deploy hook URL is still valid"
    echo "   - Verify your Vercel project exists"
    echo "   - Try regenerating the deploy hook in Vercel settings"
    exit 1
fi

echo "=========================================="
