import { TwitterApi, TweetV2, UserV2, ApiResponseError } from 'twitter-api-v2';
import { config } from '../config';
import { twitterLogger } from '../utils/logger';
import { db } from '../database/client';
import { rateLimiter } from '../utils/rate-limiter';

export interface TweetMetrics {
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
  impression_count: number;
}

export interface ExtendedTweetV2 extends TweetV2 {
  public_metrics?: TweetMetrics;
}

class TwitterClient {
  private client: TwitterApi;
  private readOnlyClient: TwitterApi;
  private currentUser: UserV2 | null = null;

  constructor() {
    // Full access client (for posting, liking, etc.)
    this.client = new TwitterApi({
      appKey: config.twitter.apiKey,
      appSecret: config.twitter.apiSecret,
      accessToken: config.twitter.accessToken,
      accessSecret: config.twitter.accessSecret,
    });

    // Read-only client using bearer token
    this.readOnlyClient = new TwitterApi(config.twitter.bearerToken);

    twitterLogger.info('Twitter client initialized');
  }

  /**
   * Wrapper to handle rate limits and errors
   */
  private async handleRateLimit<T>(
    endpoint: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // Check if we can make the request
    if (!rateLimiter.canMakeRequest(endpoint)) {
      const waitTime = rateLimiter.getTimeUntilReset(endpoint);
      twitterLogger.warn('Rate limit active, skipping request', {
        endpoint,
        resetIn: Math.ceil(waitTime),
      });
      throw new Error(`Rate limit exceeded. Resets in ${Math.ceil(waitTime)}s`);
    }

    try {
      const result = await operation();
      return result;
    } catch (error: any) {
      // Handle rate limit errors
      if (error?.code === 429 || error?.rateLimit) {
        const headers = error?.headers || {};
        rateLimiter.updateFromHeaders(endpoint, headers);
        
        twitterLogger.error('Rate limit exceeded', {
          endpoint,
          rateLimit: error?.rateLimit,
        });
      }
      throw error;
    }
  }

  async initialize(): Promise<void> {
    try {
      const user = await this.client.v2.me();
      this.currentUser = user.data;

      // Store user info in database
      await db.query(
        `INSERT INTO users (twitter_id, username, display_name, followers_count, following_count, tweet_count)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (twitter_id)
         DO UPDATE SET
           username = EXCLUDED.username,
           display_name = EXCLUDED.display_name,
           updated_at = CURRENT_TIMESTAMP`,
        [
          this.currentUser.id,
          this.currentUser.username,
          this.currentUser.name,
          0, // Will update with actual metrics
          0,
          0,
        ]
      );

      twitterLogger.info('Twitter client authenticated', {
        username: this.currentUser.username,
        id: this.currentUser.id,
      });
    } catch (error) {
      twitterLogger.error('Failed to initialize Twitter client', { error });
      throw error;
    }
  }

  // Tweet Operations
  async tweet(text: string): Promise<ExtendedTweetV2> {
    try {
      const result = await this.client.v2.tweet(text);

      await db.query(
        `INSERT INTO tweets (tweet_id, author_id, text, is_own_tweet, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [result.data.id, this.currentUser?.id, text, true, new Date()]
      );

      await db.query(
        `INSERT INTO agent_activity_log (activity_type, description, metadata)
         VALUES ($1, $2, $3)`,
        ['tweet', 'Posted new tweet', { tweet_id: result.data.id, text }]
      );

      twitterLogger.info('Tweet posted', { tweetId: result.data.id });
      return result.data as ExtendedTweetV2;
    } catch (error) {
      twitterLogger.error('Failed to post tweet', { error, text });
      throw error;
    }
  }

  async reply(tweetId: string, text: string): Promise<ExtendedTweetV2> {
    try {
      const result = await this.client.v2.reply(text, tweetId);

      await db.query(
        `INSERT INTO tweets (tweet_id, author_id, text, conversation_id, is_own_tweet, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [result.data.id, this.currentUser?.id, text, tweetId, true, new Date()]
      );

      await db.query(
        `INSERT INTO interactions (interaction_type, tweet_id, performed_by_agent, metadata)
         VALUES ($1, $2, $3, $4)`,
        ['reply', tweetId, true, { reply_id: result.data.id, text }]
      );

      twitterLogger.info('Reply posted', { tweetId, replyId: result.data.id });
      return result.data as ExtendedTweetV2;
    } catch (error) {
      twitterLogger.error('Failed to post reply', { error, tweetId, text });
      throw error;
    }
  }

  async retweet(tweetId: string): Promise<void> {
    try {
      await this.client.v2.retweet(this.currentUser!.id, tweetId);

      await db.query(
        `INSERT INTO interactions (interaction_type, tweet_id, performed_by_agent)
         VALUES ($1, $2, $3)`,
        ['retweet', tweetId, true]
      );

      twitterLogger.info('Retweeted', { tweetId });
    } catch (error) {
      twitterLogger.error('Failed to retweet', { error, tweetId });
      throw error;
    }
  }

  async like(tweetId: string): Promise<void> {
    try {
      await this.client.v2.like(this.currentUser!.id, tweetId);

      await db.query(
        `INSERT INTO interactions (interaction_type, tweet_id, performed_by_agent)
         VALUES ($1, $2, $3)`,
        ['like', tweetId, true]
      );

      twitterLogger.info('Liked tweet', { tweetId });
    } catch (error) {
      twitterLogger.error('Failed to like tweet', { error, tweetId });
      throw error;
    }
  }

  async unlike(tweetId: string): Promise<void> {
    try {
      await this.client.v2.unlike(this.currentUser!.id, tweetId);
      twitterLogger.info('Unliked tweet', { tweetId });
    } catch (error) {
      twitterLogger.error('Failed to unlike tweet', { error, tweetId });
      throw error;
    }
  }

  // Timeline and Feed
  async getHomeTimeline(maxResults: number = 10): Promise<ExtendedTweetV2[]> {
    try {
      const timeline = await this.client.v2.homeTimeline({
        max_results: maxResults,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'conversation_id'],
      });

      return timeline.data.data as ExtendedTweetV2[];
    } catch (error) {
      twitterLogger.error('Failed to fetch home timeline', { error });
      throw error;
    }
  }

  async getUserTweets(userId: string, maxResults: number = 100): Promise<ExtendedTweetV2[]> {
    try {
      const tweets = await this.client.v2.userTimeline(userId, {
        max_results: maxResults,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
      });

      return tweets.data.data as ExtendedTweetV2[];
    } catch (error) {
      twitterLogger.error('Failed to fetch user tweets', { error, userId });
      throw error;
    }
  }

  async getMentions(maxResults: number = 10): Promise<ExtendedTweetV2[]> {
    try {
      const mentions = await this.client.v2.userMentionTimeline(this.currentUser!.id, {
        max_results: maxResults,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'conversation_id'],
      });

      return mentions.data.data as ExtendedTweetV2[];
    } catch (error) {
      twitterLogger.error('Failed to fetch mentions', { error });
      throw error;
    }
  }

  // User Operations
  async follow(userId: string): Promise<void> {
    try {
      await this.client.v2.follow(this.currentUser!.id, userId);

      await db.query(
        `INSERT INTO follows (user_id, followed_by_agent)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET followed_by_agent = true`,
        [userId, true]
      );

      twitterLogger.info('Followed user', { userId });
    } catch (error) {
      twitterLogger.error('Failed to follow user', { error, userId });
      throw error;
    }
  }

  async unfollow(userId: string): Promise<void> {
    try {
      await this.client.v2.unfollow(this.currentUser!.id, userId);

      await db.query(
        `UPDATE follows SET followed_by_agent = false WHERE user_id = $1`,
        [userId]
      );

      twitterLogger.info('Unfollowed user', { userId });
    } catch (error) {
      twitterLogger.error('Failed to unfollow user', { error, userId });
      throw error;
    }
  }

  async getFollowers(maxResults: number = 100): Promise<UserV2[]> {
    try {
      const followers = await this.client.v2.followers(this.currentUser!.id, {
        max_results: maxResults,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (followers as any).data;
      return Array.isArray(data) ? data : data?.data || [];
    } catch (error) {
      twitterLogger.error('Failed to fetch followers', { error });
      throw error;
    }
  }

  async getFollowing(maxResults: number = 100): Promise<UserV2[]> {
    try {
      const following = await this.client.v2.following(this.currentUser!.id, {
        max_results: maxResults,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (following as any).data;
      return Array.isArray(data) ? data : data?.data || [];
    } catch (error) {
      twitterLogger.error('Failed to fetch following', { error });
      throw error;
    }
  }

  // Search
  async searchTweets(query: string, maxResults: number = 10): Promise<ExtendedTweetV2[]> {
    try {
      const result = await this.readOnlyClient.v2.search(query, {
        max_results: maxResults,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
      });

      return result.data.data as ExtendedTweetV2[];
    } catch (error) {
      twitterLogger.error('Failed to search tweets', { error, query });
      throw error;
    }
  }

  getCurrentUser(): UserV2 | null {
    return this.currentUser;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.readOnlyClient.v2.me();
      return true;
    } catch (error) {
      twitterLogger.error('Twitter health check failed', { error });
      return false;
    }
  }
}

export const twitterClient = new TwitterClient();
