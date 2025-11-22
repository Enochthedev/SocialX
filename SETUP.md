# SocialX - Setup Guide

Complete guide to setting up your autonomous AI social media agent.

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Docker and Docker Compose (recommended)
- PostgreSQL 16+ (if not using Docker)
- Twitter/X Developer Account with API credentials
- OpenRouter API key

## Getting Your API Keys

### Twitter/X API Credentials

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new project and app
3. Enable OAuth 1.0a with Read and Write permissions
4. Generate API keys, access tokens, and bearer token
5. You'll need:
   - API Key
   - API Secret
   - Access Token
   - Access Secret
   - Bearer Token

### OpenRouter API Key

1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Go to your API keys section
3. Create a new API key
4. Add credits to your account

## Quick Start with Docker (Recommended)

1. **Clone and setup environment:**
```bash
cd SocialX
cp .env.example .env
```

2. **Edit `.env` file with your credentials:**
```bash
# Required: Add your API keys
OPENROUTER_API_KEY=your_openrouter_key
TWITTER_API_KEY=your_twitter_key
TWITTER_API_SECRET=your_twitter_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret
TWITTER_BEARER_TOKEN=your_bearer_token

# Required: Set your Twitter username
AGENT_USERNAME=your_twitter_handle

# Recommended: Set a strong database password
POSTGRES_PASSWORD=your_secure_password
```

3. **Start all services:**
```bash
docker-compose up -d
```

4. **Check status:**
```bash
# View logs
docker-compose logs -f

# Check health
curl http://localhost:3000/health
curl http://localhost:5000/health
```

That's it! Your AI agent is now running autonomously.

## Manual Setup (Without Docker)

### 1. Setup PostgreSQL

```bash
# Install PostgreSQL
# macOS
brew install postgresql@16

# Ubuntu/Debian
sudo apt install postgresql-16

# Start PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux

# Create database and user
psql -U postgres
CREATE DATABASE socialx;
CREATE USER socialx_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE socialx TO socialx_user;
\q
```

### 2. Setup ChromaDB

```bash
# Install ChromaDB
pip install chromadb

# Run ChromaDB server
chroma run --path ./chroma-data --port 8000
```

### 3. Setup Redis

```bash
# Install Redis
brew install redis  # macOS
sudo apt install redis  # Linux

# Start Redis
brew services start redis  # macOS
sudo systemctl start redis  # Linux
```

### 4. Setup Backend (Node.js)

```bash
cd backend

# Install dependencies
npm install

# Initialize database
psql -U socialx_user -d socialx < database/init.sql

# Run migrations (if any)
npm run migrate

# Start in development mode
npm run dev

# Or build and run in production
npm run build
npm start
```

### 5. Setup AI Engine (Python)

```bash
cd ai-engine

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Download NLP models
python -m spacy download en_core_web_sm
python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt'); nltk.download('stopwords')"

# Start the service
uvicorn src.main:app --host 0.0.0.0 --port 5000 --reload
```

## Configuration

### Behavior Settings

Edit `.env` to control what your agent does:

```bash
# Enable/disable autonomous behaviors
ENABLE_AUTO_TWEET=true        # Agent will post tweets
ENABLE_AUTO_REPLY=true        # Agent will reply to mentions
ENABLE_AUTO_LIKE=true         # Agent will like tweets
ENABLE_AUTO_RETWEET=true      # Agent will retweet
ENABLE_AUTO_FOLLOW=true       # Agent will follow users
ENABLE_DM_RESPONSES=false     # Be careful with this!

# Posting schedule
MIN_TWEET_INTERVAL_HOURS=4    # Minimum hours between tweets
MAX_TWEETS_PER_DAY=10         # Maximum tweets per day
ACTIVE_HOURS_START=8          # Start posting at 8 AM
ACTIVE_HOURS_END=23           # Stop posting at 11 PM

# Engagement limits
MAX_ENGAGEMENTS_PER_HOUR=15   # Limit to avoid spam
```

### Safety Settings

```bash
# Content filtering
ENABLE_CONTENT_FILTER=true
TOXICITY_THRESHOLD=0.7        # 0-1, higher = more strict
PROFANITY_FILTER=true
POLITICAL_FILTER=false        # Set true to avoid politics
CONTROVERSIAL_TOPICS_FILTER=false

# Topics to monitor and avoid
MONITOR_KEYWORDS=ai,technology,innovation
AVOID_TOPICS=politics,religion
```

## First Run: Learning Phase

On first startup, the agent will:

1. Authenticate with Twitter/X
2. Fetch your recent tweet history (last 100 tweets)
3. Analyze your writing style and personality
4. Learn your posting patterns
5. Identify your interests and topics
6. Build a personality model

This process takes a few minutes. Check the logs:

```bash
# Docker
docker-compose logs -f backend

# Manual
# Check backend/logs/combined.log
```

## Monitoring Your Agent

### Web Dashboard

Access the status endpoints:

- Backend: http://localhost:3000/status
- AI Engine: http://localhost:5000/health
- Metrics: http://localhost:3000/metrics

### API Endpoints

```bash
# Check agent status
curl http://localhost:3000/status

# Generate a test tweet (won't post automatically)
curl -X POST http://localhost:3000/generate-tweet

# Manually post a tweet
curl -X POST http://localhost:3000/tweet \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello from my AI agent!"}'

# View metrics
curl http://localhost:3000/metrics
```

### Database Access

```bash
# Connect to database
psql -U socialx_user -d socialx

# View recent tweets
SELECT * FROM tweets ORDER BY created_at DESC LIMIT 10;

# View agent activity
SELECT * FROM agent_activity_log ORDER BY created_at DESC LIMIT 20;

# View scheduled actions
SELECT * FROM scheduled_actions WHERE status = 'pending';
```

## Customization

### Adjusting Personality

The agent learns from your tweets, but you can manually adjust:

```sql
-- View current personality traits
SELECT * FROM personality_traits;

-- Update a trait
UPDATE personality_traits
SET trait_value = '{"enthusiasm": 0.9, "formality": 0.3}'::jsonb,
    confidence = 0.8
WHERE trait_name = 'communication_style';
```

### Adding Custom Topics

```sql
-- Add topics you want the agent to talk about
INSERT INTO content_topics (topic_name, category, engagement_score)
VALUES
  ('artificial intelligence', 'technology', 0.9),
  ('machine learning', 'technology', 0.85),
  ('your favorite topic', 'personal', 0.8);
```

## Troubleshooting

### Agent not posting

1. Check if within active hours: `ACTIVE_HOURS_START` to `ACTIVE_HOURS_END`
2. Check daily limit: `MAX_TWEETS_PER_DAY`
3. Check logs for errors
4. Verify Twitter API credentials

### High API costs

1. Reduce `MAX_TWEETS_PER_DAY`
2. Increase `MIN_TWEET_INTERVAL_HOURS`
3. Disable some behaviors (auto-like, auto-retweet)
4. Use a cheaper model in OpenRouter (e.g., `meta-llama/llama-3.1-8b-instruct`)

### Database connection errors

1. Check PostgreSQL is running
2. Verify credentials in `.env`
3. Check database exists: `psql -l`
4. Check user permissions

### Twitter rate limits

The agent respects rate limits, but if you hit them:

1. Reduce `MAX_ENGAGEMENTS_PER_HOUR`
2. Increase intervals between actions
3. Check Twitter developer portal for rate limit status

## Safety and Best Practices

1. **Start Slow**: Begin with conservative settings
2. **Monitor Closely**: Watch what the agent posts in the first few days
3. **Content Filtering**: Keep `ENABLE_CONTENT_FILTER=true`
4. **Avoid Spam**: Don't set engagement rates too high
5. **Human Oversight**: Review scheduled actions periodically
6. **Backup Data**: Backup your database regularly
7. **Test in Private**: Use a test account first

## Updating the Agent

```bash
# Pull latest code
git pull origin main

# Update dependencies
cd backend && npm install
cd ../ai-engine && pip install -r requirements.txt

# Restart services
docker-compose down
docker-compose up -d --build
```

## Advanced Topics

### Using Different LLM Models

Edit `.env`:
```bash
# Use GPT-4
DEFAULT_LLM_MODEL=openai/gpt-4-turbo

# Use Claude Opus
DEFAULT_LLM_MODEL=anthropic/claude-3-opus

# Use open source (cheaper!)
DEFAULT_LLM_MODEL=meta-llama/llama-3.1-70b-instruct
```

### Scaling

For high-volume accounts:

1. Increase database pool size in `backend/src/database/client.ts`
2. Add Redis caching
3. Use a dedicated ChromaDB instance
4. Consider multiple agent instances with load balancing

## Getting Help

- Check logs first
- Review error messages
- Check GitHub issues
- Create a new issue with logs and configuration (redact API keys!)

## Next Steps

- Monitor your agent's performance
- Adjust personality and topics
- Fine-tune posting schedule
- Review and improve content quality
- Analyze engagement metrics

Enjoy your autonomous AI social media presence! 🚀
