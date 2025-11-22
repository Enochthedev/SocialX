#!/bin/bash

# Quick Start Script for SocialX
# Automates the initial setup process

set -e

echo "🚀 SocialX Quick Start"
echo "====================="
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file with your API keys!"
    echo "   Required:"
    echo "   - OPENROUTER_API_KEY"
    echo "   - TWITTER_API_KEY, TWITTER_API_SECRET"
    echo "   - TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET"
    echo "   - TWITTER_BEARER_TOKEN"
    echo "   - AGENT_USERNAME"
    echo ""
    read -p "Press Enter after you've updated .env file..."
else
    echo "✓ .env file already exists"
fi

echo ""
echo "🔍 Running validation checks..."
bash scripts/validate-setup.sh

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Validation failed. Please fix the issues above."
    exit 1
fi

echo ""
echo "🐳 Starting Docker containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

echo ""
echo "🏥 Checking service health..."

# Check backend health
echo -n "Backend (port 3000): "
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✓ Healthy"
else
    echo "⏳ Starting up... (check logs with: docker-compose logs backend)"
fi

# Check AI engine health
echo -n "AI Engine (port 5000): "
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✓ Healthy"
else
    echo "⏳ Starting up... (check logs with: docker-compose logs ai-engine)"
fi

echo ""
echo "✨ SocialX is starting up!"
echo ""
echo "📊 Useful commands:"
echo "  View logs:        docker-compose logs -f"
echo "  View status:      curl http://localhost:3000/status"
echo "  View metrics:     curl http://localhost:3000/metrics"
echo "  Stop services:    docker-compose down"
echo "  Restart:          docker-compose restart"
echo ""
echo "📚 Documentation:"
echo "  Setup guide:      cat SETUP.md"
echo "  Contributing:     cat CONTRIBUTING.md"
echo ""
echo "🎯 The agent will now:"
echo "  1. Analyze your tweet history"
echo "  2. Learn your personality and writing style"
echo "  3. Start posting and engaging autonomously"
echo ""
echo "Monitor the logs to see it in action!"
echo "  docker-compose logs -f backend"
