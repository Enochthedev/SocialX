import { twitterLogger } from './logger';

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

class RateLimiter {
  private limits: Map<string, RateLimitInfo> = new Map();

  /**
   * Update rate limit info from Twitter API response
   */
  updateFromHeaders(endpoint: string, headers: any): void {
    if (headers['x-rate-limit-limit']) {
      const info: RateLimitInfo = {
        limit: parseInt(headers['x-rate-limit-limit']),
        remaining: parseInt(headers['x-rate-limit-remaining']),
        reset: parseInt(headers['x-rate-limit-reset']),
      };
      this.limits.set(endpoint, info);
      
      if (info.remaining === 0) {
        const resetDate = new Date(info.reset * 1000);
        twitterLogger.warn('Rate limit reached', {
          endpoint,
          resetAt: resetDate.toISOString(),
        });
      }
    }
  }

  /**
   * Check if we can make a request to this endpoint
   */
  canMakeRequest(endpoint: string): boolean {
    const info = this.limits.get(endpoint);
    if (!info) return true; // No info yet, allow request

    if (info.remaining === 0) {
      const now = Date.now() / 1000;
      if (now < info.reset) {
        return false; // Still rate limited
      }
      // Reset time has passed, clear the limit
      this.limits.delete(endpoint);
      return true;
    }

    return info.remaining > 0;
  }

  /**
   * Get time until rate limit resets (in seconds)
   */
  getTimeUntilReset(endpoint: string): number {
    const info = this.limits.get(endpoint);
    if (!info) return 0;

    const now = Date.now() / 1000;
    return Math.max(0, info.reset - now);
  }

  /**
   * Get rate limit info for an endpoint
   */
  getInfo(endpoint: string): RateLimitInfo | null {
    return this.limits.get(endpoint) || null;
  }

  /**
   * Wait until rate limit resets
   */
  async waitForReset(endpoint: string): Promise<void> {
    const waitTime = this.getTimeUntilReset(endpoint);
    if (waitTime > 0) {
      twitterLogger.info('Waiting for rate limit reset', {
        endpoint,
        waitSeconds: Math.ceil(waitTime),
      });
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    }
  }
}

export const rateLimiter = new RateLimiter();
