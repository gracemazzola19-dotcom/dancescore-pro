#!/bin/bash
# Script to restart the server

echo "🛑 Stopping server..."
pkill -f "node index.js" 2>/dev/null
sleep 2

echo "🚀 Starting server..."
cd /Users/gracemazzola/dancescore-pro/server
npm start > /tmp/server.log 2>&1 &

sleep 3
echo "✅ Server restarted!"
echo ""
echo "📋 Server logs:"
tail -15 /tmp/server.log
echo ""
echo "💡 To view logs in real-time, run:"
echo "   tail -f /tmp/server.log"
