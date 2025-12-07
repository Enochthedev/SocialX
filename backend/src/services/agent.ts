import { config } from '../config';
import { agentLogger } from '../utils/logger';
import { twitterClient, ExtendedTweetV2 } from './twitter';
import { openRouterClient } from './openrouter';
import { safetyService } from './safety';
import { schedulerService } from './scheduler';
import { vectorDBService } from './vectordb';
import { db } from '../database/client';

class AgentService {
  private personality: string = '';
  private isRunning: boolean = false;

  async initialize(): Promise<void> {
    agentLogger.info('Initializing agent service');

    try {
      // Initialize Twitter client
      await twitterClient.initialize();

      // Initialize vector database
      await vectorDBService.initialize();

      // Initialize scheduler
      await schedulerService.initialize();

      // Load or build personality model
      await this.loadPersonality();

      // Start learning from history if enabled
      if (config.learning.analyzeTweetHistory) {
        await this.learnFromHistory();
      }

      this.isRunning = true;
      agentLogger.info('Agent service initialized and running', {
        mode: config.agent.mode,
        username: config.agent.username,
      });
    } catch (error) {
      agentLogger.error('Failed to initialize agent service', { error });
      throw error;
    }
  }

  private async loadPersonality(): Promise<void> {
    try {
      // Try to load personality from database
      const result = await db.query(
        `SELECT trait_name, trait_value FROM personality_traits ORDER BY confidence DESC`
      );

      if (result.rows.length > 0) {
        const traits = result.rows.map((row: { trait_name: string; trait_value: unknown }) =>
          `${row.trait_name}: ${JSON.stringify(row.trait_value)}`
        ).join(', ');

        this.personality = `Personality traits: ${traits}`;
        agentLogger.info('Loaded personality from database', { traitCount: result.rows.length });
      } else {
        // Default personality
        this.personality = 'Friendly, helpful, curious, and engaged with technology and innovation';
        agentLogger.info('Using default personality');
      }
    } catch (error) {
      agentLogger.error('Failed to load personality', { error });
      this.personality = 'Friendly and helpful';
    }
  }

  private async learnFromHistory(): Promise<void> {
    agentLogger.info('Starting to learn from tweet history...');

    try {
      const user = twitterClient.getCurrentUser();
      if (!user) {
        agentLogger.warn('Cannot learn from history - user not authenticated');
        return;
      }

      // Adjust tweet count based on free tier mode
      const tweetCount = config.twitter.freeTier ? 10 : 100;
      agentLogger.info(`Fetching ${tweetCount} tweets for analysis (free tier: ${config.twitter.freeTier})`);

      // Fetch user's recent tweets
      const tweets = await twitterClient.getUserTweets(user.id, tweetCount);

      agentLogger.info(`Analyzing ${tweets.length} tweets for learning`);

      // Store tweets in database
      for (const tweet of tweets) {
        await db.query(
          `INSERT INTO tweets (tweet_id, author_id, text, is_own_tweet, created_at, metrics)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (tweet_id) DO NOTHING`,
          [
            tweet.id,
            user.id,
            tweet.text,
            true,
            tweet.created_at || new Date(),
            JSON.stringify(tweet.public_metrics || {}),
          ]
        );

        // Add to vector DB for semantic search
        await vectorDBService.addMemory({
          id: `tweet_${tweet.id}`,
          content: tweet.text,
          metadata: {
            type: 'own_tweet',
            created_at: tweet.created_at,
            metrics: tweet.public_metrics,
          },
        });

        // Extract and store topics
        if (config.learning.topicExtraction) {
          const topics = await openRouterClient.extractTopics(tweet.text);
          for (const topic of topics) {
            await db.query(
              `INSERT INTO content_topics (topic_name, tweet_count)
               VALUES ($1, 1)
               ON CONFLICT (topic_name) DO UPDATE
               SET tweet_count = content_topics.tweet_count + 1,
                   last_mentioned = CURRENT_TIMESTAMP`,
              [topic]
            );
          }
        }
      }

      agentLogger.info('Completed learning from tweet history');
    } catch (error) {
      agentLogger.error('Failed to learn from history', { error });
    }
  }

  async generateTweet(forceGenerate: boolean = false): Promise<string | null> {
    if (!config.behavior.autoTweet && !forceGenerate) {
      return null;
    }

    try {
      agentLogger.info('Generating new tweet');

      // Get recent topics and context
      const topicsResult = await db.query(
        `SELECT topic_name, engagement_score
         FROM content_topics
         ORDER BY engagement_score DESC, last_mentioned DESC
         LIMIT 5`
      );

      const topics = topicsResult.rows.map((r: { topic_name: string }) => r.topic_name);
      const topicsContext = topics.length > 0 ? `Recent topics: ${topics.join(', ')}` : '';

      // Get recent memories (handle case where vector DB is empty)
      let memoryContext = '';
      try {
        const recentMemories = await vectorDBService.searchSimilar('recent thoughts and ideas', 3);
        memoryContext = recentMemories.map(m => m.content).join(' ');
      } catch (error) {
        agentLogger.debug('No memories found in vector DB, continuing without memory context');
      }

      const context = `${topicsContext}\n${memoryContext}\nPersonality: ${this.personality}`;

      // Generate tweet
      const tweetText = await openRouterClient.generateTweet(
        'Generate an engaging, authentic tweet based on my personality and interests.',
        context
      );

      // Safety check
      const safetyCheck = await safetyService.checkContent(tweetText);

      if (!safetyCheck.safe) {
        agentLogger.warn('Generated tweet failed safety check', {
          text: tweetText,
          reasons: safetyCheck.reasons,
        });

        // Try to get a safer version
        const validation = await safetyService.validateTweetIdea(tweetText);
        if (validation.suggestion) {
          return validation.suggestion;
        }

        return null;
      }

      agentLogger.info('Tweet generated successfully', { text: tweetText });
      return tweetText;
    } catch (error) {
      agentLogger.error('Failed to generate tweet', { error });
      return null;
    }
  }

  async postTweet(text: string): Promise<void> {
    try {
      const tweet = await twitterClient.tweet(text);

      // Add to memories
      await vectorDBService.addMemory({
        id: `tweet_${tweet.id}`,
        content: text,
        metadata: {
          type: 'generated_tweet',
          tweet_id: tweet.id,
          created_at: new Date().toISOString(),
        },
      });

      agentLogger.info('Tweet posted successfully', { tweetId: tweet.id });
    } catch (error) {
      agentLogger.error('Failed to post tweet', { error });
      throw error;
    }
  }

  async handleMention(mention: ExtendedTweetV2): Promise<void> {
    if (!config.engagement.replyToMentions) {
      return;
    }

    try {
      agentLogger.info('Processing mention', {
        tweetId: mention.id,
        author: mention.author_id,
      });

      // Check if we should engage
      const shouldEngage = await safetyService.shouldEngageWithUser(
        mention.author_id || '',
        '' // username not available in this context
      );

      if (!shouldEngage) {
        agentLogger.info('Skipping mention based on user check', {
          tweetId: mention.id,
        });
        return;
      }

      // Get conversation context
      const conversationContext = await this.getConversationContext(mention.conversation_id || mention.id);

      // Generate reply
      const replyText = await openRouterClient.generateReply(
        mention.text,
        conversationContext,
        this.personality
      );

      // Safety check
      const safetyCheck = await safetyService.checkContent(replyText);

      if (!safetyCheck.safe) {
        agentLogger.warn('Generated reply failed safety check', {
          text: replyText,
          reasons: safetyCheck.reasons,
        });
        return;
      }

      // Post reply
      await twitterClient.reply(mention.id, replyText);

      agentLogger.info('Reply posted', {
        originalTweetId: mention.id,
        replyText,
      });
    } catch (error) {
      agentLogger.error('Failed to handle mention', { error, mentionId: mention.id });
    }
  }

  async engageWithTimeline(): Promise<void> {
    if (!config.engagement.engageWithTimeline) {
      return;
    }

    try {
      agentLogger.info('Engaging with timeline');

      const timeline = await twitterClient.getHomeTimeline(10);

      let engagementCount = 0;
      const maxEngagements = Math.min(3, config.engagement.maxEngagementsPerHour);

      for (const tweet of timeline) {
        if (engagementCount >= maxEngagements) {
          break;
        }

        // Decide whether to engage
        const decision = await openRouterClient.shouldEngageWithTweet(
          tweet.text,
          this.personality
        );

        if (decision.engage) {
          // Randomly choose engagement type
          const rand = Math.random();

          if (rand < 0.3 && config.behavior.autoLike) {
            await twitterClient.like(tweet.id);
            agentLogger.info('Liked tweet', { tweetId: tweet.id });
          } else if (rand < 0.5 && config.behavior.autoRetweet) {
            await twitterClient.retweet(tweet.id);
            agentLogger.info('Retweeted tweet', { tweetId: tweet.id });
          } else if (config.behavior.autoReply) {
            const replyText = await openRouterClient.generateReply(
              tweet.text,
              '',
              this.personality
            );

            const safetyCheck = await safetyService.checkContent(replyText);
            if (safetyCheck.safe) {
              await twitterClient.reply(tweet.id, replyText);
              agentLogger.info('Replied to tweet', { tweetId: tweet.id });
            }
          }

          engagementCount++;
        }
      }

      agentLogger.info('Timeline engagement complete', { engagements: engagementCount });
    } catch (error) {
      agentLogger.error('Failed to engage with timeline', { error });
    }
  }

  private async getConversationContext(conversationId: string): Promise<string> {
    try {
      const result = await db.query(
        `SELECT text, created_at
         FROM tweets
         WHERE conversation_id = $1
         ORDER BY created_at ASC
         LIMIT 5`,
        [conversationId]
      );

      if (result.rows.length === 0) {
        return '';
      }

      return result.rows.map((r: { text: string }) => r.text).join('\n');
    } catch (error) {
      agentLogger.error('Failed to get conversation context', { error });
      return '';
    }
  }

  async getStatus(): Promise<Record<string, unknown>> {
    const memoryCount = await vectorDBService.count();
    const user = twitterClient.getCurrentUser();

    return {
      isRunning: this.isRunning,
      mode: config.agent.mode,
      username: user?.username,
      memoryCount,
      personality: this.personality,
      behaviors: {
        autoTweet: config.behavior.autoTweet,
        autoReply: config.behavior.autoReply,
        autoLike: config.behavior.autoLike,
        autoRetweet: config.behavior.autoRetweet,
        autoFollow: config.behavior.autoFollow,
      },
    };
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    schedulerService.stop();
    agentLogger.info('Agent service stopped');
  }
}

export const agentService = new AgentService();
