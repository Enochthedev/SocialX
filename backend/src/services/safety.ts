import { config } from '../config';
import { logger } from '../utils/logger';
import { openRouterClient } from './openrouter';
import Sentiment from 'sentiment';

const sentiment = new Sentiment();

// Profanity list (basic - extend as needed)
const PROFANITY_LIST = [
  'fuck', 'shit', 'damn', 'bitch', 'ass', 'bastard', 'crap',
  'hell', 'piss', 'dick', 'cock', 'pussy', 'slut', 'whore'
];

// Political keywords (extend as needed)
const POLITICAL_KEYWORDS = [
  'trump', 'biden', 'republican', 'democrat', 'liberal', 'conservative',
  'election', 'vote', 'congress', 'senate', 'political', 'politics'
];

// Controversial topics
const CONTROVERSIAL_TOPICS = [
  'abortion', 'gun control', 'immigration', 'religion', 'race',
  'gender', 'climate change', 'vaccine', 'covid'
];

export interface SafetyCheckResult {
  safe: boolean;
  reasons: string[];
  score: number;
  warnings: string[];
}

class SafetyService {
  async checkContent(text: string): Promise<SafetyCheckResult> {
    const result: SafetyCheckResult = {
      safe: true,
      reasons: [],
      score: 1.0,
      warnings: [],
    };

    if (!config.safety.enableContentFilter) {
      return result;
    }

    // Check profanity
    if (config.safety.profanityFilter) {
      const hasProfanity = this.checkProfanity(text);
      if (hasProfanity) {
        result.safe = false;
        result.reasons.push('Contains profanity');
        result.score -= 0.3;
      }
    }

    // Check political content
    if (config.safety.politicalFilter) {
      const isPolitical = this.checkPolitical(text);
      if (isPolitical) {
        result.safe = false;
        result.reasons.push('Contains political content');
        result.score -= 0.2;
      }
    }

    // Check controversial topics
    if (config.safety.controversialTopicsFilter) {
      const isControversial = this.checkControversial(text);
      if (isControversial) {
        result.safe = false;
        result.reasons.push('Contains controversial topic');
        result.score -= 0.2;
      }
    }

    // Check sentiment
    const sentimentScore = this.analyzeSentiment(text);
    if (sentimentScore < -3) {
      result.warnings.push('Very negative sentiment detected');
      result.score -= 0.1;
    }

    // Check toxicity using AI
    try {
      const toxicity = await this.checkToxicity(text);
      if (toxicity > config.safety.toxicityThreshold) {
        result.safe = false;
        result.reasons.push(`High toxicity detected (${toxicity.toFixed(2)})`);
        result.score -= 0.4;
      } else if (toxicity > 0.5) {
        result.warnings.push(`Moderate toxicity detected (${toxicity.toFixed(2)})`);
      }
    } catch (error) {
      logger.warn('Toxicity check failed', { error });
    }

    // Check against avoid topics
    if (config.monitoring.avoidTopics.length > 0) {
      const hasAvoidTopic = this.checkAvoidTopics(text);
      if (hasAvoidTopic) {
        result.warnings.push('Contains topic marked to avoid');
        result.score -= 0.1;
      }
    }

    // Check length
    if (text.length > 280) {
      result.safe = false;
      result.reasons.push('Exceeds Twitter character limit (280)');
    }

    result.score = Math.max(0, result.score);

    logger.debug('Content safety check complete', {
      safe: result.safe,
      score: result.score,
      textLength: text.length,
    });

    return result;
  }

  private checkProfanity(text: string): boolean {
    const lowerText = text.toLowerCase();
    return PROFANITY_LIST.some(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lowerText);
    });
  }

  private checkPolitical(text: string): boolean {
    const lowerText = text.toLowerCase();
    return POLITICAL_KEYWORDS.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(lowerText);
    });
  }

  private checkControversial(text: string): boolean {
    const lowerText = text.toLowerCase();
    return CONTROVERSIAL_TOPICS.some(topic => {
      const regex = new RegExp(`\\b${topic}\\b`, 'i');
      return regex.test(lowerText);
    });
  }

  private checkAvoidTopics(text: string): boolean {
    const lowerText = text.toLowerCase();
    return config.monitoring.avoidTopics.some(topic => {
      const regex = new RegExp(`\\b${topic.toLowerCase()}\\b`, 'i');
      return regex.test(lowerText);
    });
  }

  private analyzeSentiment(text: string): number {
    const result = sentiment.analyze(text);
    return result.score;
  }

  private async checkToxicity(text: string): Promise<number> {
    try {
      const response = await openRouterClient.chat({
        messages: [
          {
            role: 'system',
            content: 'You are a content moderation expert. Analyze the toxicity of the given text on a scale of 0-1, where 0 is completely safe and 1 is extremely toxic. Respond with only a number between 0 and 1.',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.1,
        max_tokens: 10,
      });

      const score = parseFloat(response.choices[0].message.content.trim());
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch (error) {
      logger.error('Toxicity check failed', { error });
      return 0.5; // Default to moderate when check fails
    }
  }

  async shouldEngageWithUser(userId: string, username: string): Promise<boolean> {
    // Check if user is blocked or on a blacklist
    // This is a placeholder - implement your own logic

    // For now, engage with everyone
    return true;
  }

  async validateTweetIdea(idea: string): Promise<{ valid: boolean; suggestion?: string }> {
    try {
      const safetyCheck = await this.checkContent(idea);

      if (!safetyCheck.safe) {
        // Try to get AI to suggest a safer version
        const response = await openRouterClient.chat({
          messages: [
            {
              role: 'system',
              content: 'You are helping to make content safer while preserving intent. Suggest a safer alternative that maintains the core message.',
            },
            {
              role: 'user',
              content: `Original: "${idea}"\nIssues: ${safetyCheck.reasons.join(', ')}\n\nSuggest a safer alternative:`,
            },
          ],
          temperature: 0.7,
          max_tokens: 100,
        });

        return {
          valid: false,
          suggestion: response.choices[0].message.content.trim(),
        };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Tweet validation failed', { error });
      return { valid: false };
    }
  }
}

export const safetyService = new SafetyService();
