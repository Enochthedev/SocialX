import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  // OpenRouter
  openrouter: z.object({
    apiKey: z.string().min(1, 'OpenRouter API key is required'),
    baseUrl: z.string().url().default('https://openrouter.ai/api/v1'),
    defaultModel: z.string().default('anthropic/claude-3.5-sonnet'),
  }),

  // Twitter/X
  twitter: z.object({
    apiKey: z.string().min(1, 'Twitter API key is required'),
    apiSecret: z.string().min(1, 'Twitter API secret is required'),
    accessToken: z.string().min(1, 'Twitter access token is required'),
    accessSecret: z.string().min(1, 'Twitter access secret is required'),
    bearerToken: z.string().min(1, 'Twitter bearer token is required'),
  }),

  // Database
  database: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(5432),
    name: z.string().default('socialx'),
    user: z.string().default('socialx_user'),
    password: z.string().min(1, 'Database password is required'),
  }),

  // ChromaDB
  chromadb: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(8000),
    collection: z.string().default('socialx_memories'),
  }),

  // Redis
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(6379),
    password: z.string().optional(),
  }),

  // Agent Configuration
  agent: z.object({
    username: z.string().min(1, 'Agent username is required'),
    mode: z.enum(['autonomous', 'semi-autonomous', 'learning-only']).default('autonomous'),
  }),

  // Behavior Settings
  behavior: z.object({
    autoTweet: z.boolean().default(true),
    autoReply: z.boolean().default(true),
    autoLike: z.boolean().default(true),
    autoRetweet: z.boolean().default(true),
    autoFollow: z.boolean().default(true),
    dmResponses: z.boolean().default(false),
  }),

  // Posting Schedule
  schedule: z.object({
    minTweetIntervalHours: z.number().min(1).default(4),
    maxTweetsPerDay: z.number().min(1).default(10),
    activeHoursStart: z.number().min(0).max(23).default(8),
    activeHoursEnd: z.number().min(0).max(23).default(23),
    timezone: z.string().default('America/New_York'),
  }),

  // Engagement Settings
  engagement: z.object({
    replyToMentions: z.boolean().default(true),
    replyToDMs: z.boolean().default(false),
    engageWithFollowers: z.boolean().default(true),
    engageWithTimeline: z.boolean().default(true),
    maxEngagementsPerHour: z.number().min(1).default(15),
  }),

  // Learning Settings
  learning: z.object({
    analyzeTweetHistory: z.boolean().default(true),
    learnFromInteractions: z.boolean().default(true),
    sentimentAnalysis: z.boolean().default(true),
    topicExtraction: z.boolean().default(true),
  }),

  // Safety Settings
  safety: z.object({
    enableContentFilter: z.boolean().default(true),
    toxicityThreshold: z.number().min(0).max(1).default(0.7),
    profanityFilter: z.boolean().default(true),
    politicalFilter: z.boolean().default(false),
    controversialTopicsFilter: z.boolean().default(false),
  }),

  // Monitoring
  monitoring: z.object({
    keywords: z.array(z.string()).default([]),
    hashtags: z.array(z.string()).default([]),
    avoidTopics: z.array(z.string()).default([]),
  }),

  // Logging
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    toFile: z.boolean().default(true),
    dir: z.string().default('./logs'),
  }),

  // Server
  server: z.object({
    port: z.number().default(3000),
    aiEnginePort: z.number().default(5000),
  }),

  // Environment
  env: z.enum(['development', 'production', 'test']).default('development'),
  debug: z.boolean().default(false),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const rawConfig = {
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseUrl: process.env.OPENROUTER_BASE_URL,
      defaultModel: process.env.DEFAULT_LLM_MODEL,
    },
    twitter: {
      apiKey: process.env.TWITTER_API_KEY || '',
      apiSecret: process.env.TWITTER_API_SECRET || '',
      accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
      accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
      bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
    },
    database: {
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT) : undefined,
      name: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD || '',
    },
    chromadb: {
      host: process.env.CHROMADB_HOST,
      port: process.env.CHROMADB_PORT ? parseInt(process.env.CHROMADB_PORT) : undefined,
      collection: process.env.CHROMADB_COLLECTION,
    },
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : undefined,
      password: process.env.REDIS_PASSWORD,
    },
    agent: {
      username: process.env.AGENT_USERNAME || '',
      mode: process.env.AGENT_MODE as 'autonomous' | 'semi-autonomous' | 'learning-only' | undefined,
    },
    behavior: {
      autoTweet: process.env.ENABLE_AUTO_TWEET === 'true',
      autoReply: process.env.ENABLE_AUTO_REPLY === 'true',
      autoLike: process.env.ENABLE_AUTO_LIKE === 'true',
      autoRetweet: process.env.ENABLE_AUTO_RETWEET === 'true',
      autoFollow: process.env.ENABLE_AUTO_FOLLOW === 'true',
      dmResponses: process.env.ENABLE_DM_RESPONSES === 'true',
    },
    schedule: {
      minTweetIntervalHours: process.env.MIN_TWEET_INTERVAL_HOURS ? parseInt(process.env.MIN_TWEET_INTERVAL_HOURS) : undefined,
      maxTweetsPerDay: process.env.MAX_TWEETS_PER_DAY ? parseInt(process.env.MAX_TWEETS_PER_DAY) : undefined,
      activeHoursStart: process.env.ACTIVE_HOURS_START ? parseInt(process.env.ACTIVE_HOURS_START) : undefined,
      activeHoursEnd: process.env.ACTIVE_HOURS_END ? parseInt(process.env.ACTIVE_HOURS_END) : undefined,
      timezone: process.env.TIMEZONE,
    },
    engagement: {
      replyToMentions: process.env.REPLY_TO_MENTIONS === 'true',
      replyToDMs: process.env.REPLY_TO_DMS === 'true',
      engageWithFollowers: process.env.ENGAGE_WITH_FOLLOWERS === 'true',
      engageWithTimeline: process.env.ENGAGE_WITH_TIMELINE === 'true',
      maxEngagementsPerHour: process.env.MAX_ENGAGEMENTS_PER_HOUR ? parseInt(process.env.MAX_ENGAGEMENTS_PER_HOUR) : undefined,
    },
    learning: {
      analyzeTweetHistory: process.env.ANALYZE_TWEET_HISTORY === 'true',
      learnFromInteractions: process.env.LEARN_FROM_INTERACTIONS === 'true',
      sentimentAnalysis: process.env.SENTIMENT_ANALYSIS === 'true',
      topicExtraction: process.env.TOPIC_EXTRACTION === 'true',
    },
    safety: {
      enableContentFilter: process.env.ENABLE_CONTENT_FILTER === 'true',
      toxicityThreshold: process.env.TOXICITY_THRESHOLD ? parseFloat(process.env.TOXICITY_THRESHOLD) : undefined,
      profanityFilter: process.env.PROFANITY_FILTER === 'true',
      politicalFilter: process.env.POLITICAL_FILTER === 'true',
      controversialTopicsFilter: process.env.CONTROVERSIAL_TOPICS_FILTER === 'true',
    },
    monitoring: {
      keywords: process.env.MONITOR_KEYWORDS?.split(',').map(k => k.trim()).filter(Boolean) || [],
      hashtags: process.env.MONITOR_HASHTAGS?.split(',').map(h => h.trim()).filter(Boolean) || [],
      avoidTopics: process.env.AVOID_TOPICS?.split(',').map(t => t.trim()).filter(Boolean) || [],
    },
    logging: {
      level: process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error' | undefined,
      toFile: process.env.LOG_TO_FILE === 'true',
      dir: process.env.LOG_DIR,
    },
    server: {
      port: process.env.BACKEND_PORT ? parseInt(process.env.BACKEND_PORT) : undefined,
      aiEnginePort: process.env.AI_ENGINE_PORT ? parseInt(process.env.AI_ENGINE_PORT) : undefined,
    },
    env: process.env.NODE_ENV as 'development' | 'production' | 'test' | undefined,
    debug: process.env.DEBUG === 'true',
  };

  try {
    return configSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid configuration');
    }
    throw error;
  }
}

export const config = loadConfig();
