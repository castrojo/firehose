#!/bin/bash
# Reliable Astro preview server restart script

echo "🛑 Stopping any existing Astro preview servers..."
pkill -9 -f "astro preview" 2>/dev/null
pkill -9 -f "node.*preview" 2>/dev/null
pkill -9 -f "node.*astro" 2>/dev/null

# Wait for processes to fully terminate
sleep 2

# Check if ports are free
for port in 4321 4322 4323 4324; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo "⚠️  Port $port still in use, force killing..."
        lsof -ti:$port | xargs kill -9 2>/dev/null
    fi
done

sleep 1

echo "🏗️  Starting preview server..."
cd /var/home/jorge/src/firehose
nohup npm run preview > /tmp/astro-preview.log 2>&1 &

# Wait for server to start
sleep 4

# Test if server is responding
for i in {1..10}; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/firehose/ | grep -q "200"; then
        echo "✅ Preview server running at http://localhost:4321/firehose"
        exit 0
    fi
    echo "⏳ Waiting for server to start (attempt $i/10)..."
    sleep 2
done

echo "❌ Server failed to start. Check /tmp/astro-preview.log for errors"
tail -20 /tmp/astro-preview.log
exit 1
