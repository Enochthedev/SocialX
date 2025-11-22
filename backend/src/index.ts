import express from 'express';
import { config } from './config';
import { logger } from './utils/logger';
import { db } from './database/client';
import { twitterClient } from './services/twitter';
import { vectorDBService } from './services/vectordb';
import { agentService } from './services/agent';

const app = express();

app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealthy = await db.healthCheck();
  const twitterHealthy = await twitterClient.healthCheck();
  const vectorDBHealthy = await vectorDBService.healthCheck();

  const healthy = dbHealthy && twitterHealthy && vectorDBHealthy;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    services: {
      database: dbHealthy ? 'up' : 'down',
      twitter: twitterHealthy ? 'up' : 'down',
      vectordb: vectorDBHealthy ? 'up' : 'down',
    },
    timestamp: new Date().toISOString(),
  });
});

// Status endpoint
app.get('/status', async (req, res) => {
  try {
    const status = await agentService.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Failed to get agent status', { error });
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Manual tweet endpoint (for testing)
app.post('/tweet', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    await agentService.postTweet(text);
    res.json({ success: true, message: 'Tweet posted' });
  } catch (error) {
    logger.error('Failed to post tweet via API', { error });
    res.status(500).json({ error: 'Failed to post tweet' });
  }
});

// Generate tweet endpoint
app.post('/generate-tweet', async (req, res) => {
  try {
    const tweet = await agentService.generateTweet();

    if (!tweet) {
      return res.status(400).json({ error: 'Failed to generate tweet' });
    }

    res.json({ tweet });
  } catch (error) {
    logger.error('Failed to generate tweet via API', { error });
    res.status(500).json({ error: 'Failed to generate tweet' });
  }
});

// Get agent metrics
app.get('/metrics', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE is_own_tweet = true) as own_tweets,
         COUNT(*) FILTER (WHERE is_own_tweet = false) as other_tweets,
         (SELECT COUNT(*) FROM interactions WHERE performed_by_agent = true) as total_interactions,
         (SELECT COUNT(*) FROM interactions WHERE interaction_type = 'like' AND performed_by_agent = true) as likes,
         (SELECT COUNT(*) FROM interactions WHERE interaction_type = 'retweet' AND performed_by_agent = true) as retweets,
         (SELECT COUNT(*) FROM interactions WHERE interaction_type = 'reply' AND performed_by_agent = true) as replies
       FROM tweets`
    );

    const topicsResult = await db.query(
      `SELECT topic_name, engagement_score, tweet_count
       FROM content_topics
       ORDER BY engagement_score DESC
       LIMIT 10`
    );

    res.json({
      tweets: result.rows[0],
      topics: topicsResult.rows,
    });
  } catch (error) {
    logger.error('Failed to get metrics', { error });
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');

  await agentService.stop();
  await db.close();

  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
async function start() {
  try {
    logger.info('Starting SocialX Agent Backend...', {
      env: config.env,
      port: config.server.port,
    });

    // Initialize agent service
    await agentService.initialize();

    // Start Express server
    app.listen(config.server.port, () => {
      logger.info(`Server running on port ${config.server.port}`, {
        mode: config.agent.mode,
        username: config.agent.username,
      });
    });

    logger.info('✨ SocialX Agent is running!');
  } catch (error) {
    logger.error('Failed to start application', { error });
    process.exit(1);
  }
}

start();
