#!/bin/bash

# WorshipWise Development Startup Script

echo "🎵 Starting WorshipWise Development Environment..."

# Check if PocketBase exists
if [ ! -f "pocketbase/pocketbase" ]; then
    echo "❌ PocketBase not found. Please run the setup first."
    exit 1
fi

# Check if PocketBase is already running
if curl -s http://localhost:8090/api/health > /dev/null; then
    echo "✅ PocketBase is already running on http://localhost:8090"
    echo "🔑 Admin UI: http://localhost:8090/_/"
    POCKETBASE_PID=""
else
    # Start PocketBase in the background
    echo "🗄️  Starting PocketBase..."
    cd pocketbase
    ./pocketbase serve --dev &
    POCKETBASE_PID=$!
    cd ..

    # Wait a moment for PocketBase to start
    sleep 2

    # Check if PocketBase started successfully
    if curl -s http://localhost:8090/api/health > /dev/null; then
        echo "✅ PocketBase is running on http://localhost:8090"
        echo "🔑 Admin UI: http://localhost:8090/_/"
    else
        echo "❌ Failed to start PocketBase"
        kill $POCKETBASE_PID 2>/dev/null
        exit 1
    fi
fi

# Start SvelteKit dev server
echo "🚀 Starting SvelteKit..."
npm run dev

# Cleanup function
cleanup() {
    echo "🛑 Shutting down..."
    # Only kill PocketBase if we started it
    if [ -n "$POCKETBASE_PID" ]; then
        kill $POCKETBASE_PID 2>/dev/null
        echo "🗄️  PocketBase stopped"
    else
        echo "🗄️  PocketBase was already running, leaving it running"
    fi
    exit 0
}

# Trap cleanup on exit
trap cleanup INT TERM