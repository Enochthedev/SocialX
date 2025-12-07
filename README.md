# SocialX - AI Social Media Agent

An autonomous AI agent that learns from your Twitter/X activity and manages your social presence.

> **🚀 Quick Start**: See [QUICK_START.md](QUICK_START.md) for a fast introduction and testing guide!
> 
> **✅ System Status**: All components working! Tweet generation tested and operational.

## Features

- 🤖 **Fully Autonomous**: Automatically posts, engages, and manages your Twitter presence
- 🧠 **Personality Learning**: Analyzes your tweets, likes, and interactions to learn your unique voice
- 💬 **Natural Engagement**: Replies to mentions, DMs, and engages with your network authentically
- 📊 **Smart Analytics**: Tracks performance and continuously improves
- 🔒 **Safety First**: Built-in content filtering and safety checks
- 🎯 **Topic Monitoring**: Watches for keywords and trends relevant to you

## Architecture

### Hybrid System
- **Backend Service** (Node.js/TypeScript): Twitter API integration, scheduling, orchestration
- **AI Engine** (Python): Personality modeling, learning algorithms, embeddings
- **Databases**: PostgreSQL + ChromaDB for semantic memory
- **LLM**: OpenRouter for flexible multi-model access

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- Twitter/X API credentials
- OpenRouter API key

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd SocialX

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start with Docker
docker-compose up -d

# Or run locally:

# Backend
cd backend
npm install
npm run dev

# AI Engine (in another terminal)
cd ai-engine
pip install -r requirements.txt
uvicorn src.main:app --host 0.0.0.0 --port 5001 --reload
```

## Configuration

See `.env.example` for all configuration options.

### Twitter API Free Tier

If you're using Twitter's free tier, be aware of these limitations:
- **Very limited API calls** (as low as 1-10 requests per day)
- **Rate limits reset every 24 hours**
- The agent will automatically respect rate limits and retry when limits reset
- Consider upgrading to Basic ($100/month) or Pro tier for full functionality

To optimize for free tier:
1. Set `MAX_TWEETS_PER_DAY=1` in `.env`
2. Set `MAX_ENGAGEMENTS_PER_HOUR=1` in `.env`
3. Disable auto-features: `ENABLE_AUTO_TWEET=false`, `ENABLE_AUTO_REPLY=false`
4. Use `AGENT_MODE=learning-only` to just analyze without posting

## Project Structure

```
SocialX/
├── backend/              # Node.js/TypeScript service
│   ├── src/
│   │   ├── services/     # Core services (Twitter, OpenRouter, Agent)
│   │   ├── models/       # Data models
│   │   ├── utils/        # Utilities
│   │   └── index.ts      # Entry point
├── ai-engine/            # Python ML service
│   ├── src/
│   │   ├── personality/  # Personality modeling
│   │   ├── learning/     # Learning algorithms
│   │   ├── analysis/     # Content analysis
│   │   └── embeddings/   # Vector operations
├── shared/               # Shared types and configs
└── docker-compose.yml    # Docker orchestration
```

## How It Works

1. **Learning Phase**: Analyzes your tweet history, engagement patterns, and preferences
2. **Personality Modeling**: Creates a unique personality model based on your writing style
3. **Autonomous Operation**: Generates and posts content, engages with your network
4. **Continuous Improvement**: Learns from performance and adjusts strategy

## Safety & Ethics

- Content filtering to prevent inappropriate posts
- Rate limiting to avoid spam behavior
- Configurable autonomy levels
- All actions logged for transparency

## License

MIT

## Contributing

Contributions welcome! Please read CONTRIBUTING.md first.
