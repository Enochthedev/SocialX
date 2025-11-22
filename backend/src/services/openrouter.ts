import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { aiLogger } from '../utils/logger';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model?: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    message: Message;
    finish_reason: string;
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class OpenRouterClient {
  private client: AxiosInstance;
  private defaultModel: string;

  constructor() {
    this.defaultModel = config.openrouter.defaultModel;
    this.client = axios.create({
      baseURL: config.openrouter.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.openrouter.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/socialx/agent',
        'X-Title': 'SocialX AI Agent',
      },
      timeout: 60000,
    });

    aiLogger.info('OpenRouter client initialized', { model: this.defaultModel });
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    try {
      const model = request.model || this.defaultModel;
      const startTime = Date.now();

      aiLogger.debug('Sending chat completion request', {
        model,
        messageCount: request.messages.length,
      });

      const response = await this.client.post<ChatCompletionResponse>('/chat/completions', {
        ...request,
        model,
      });

      const duration = Date.now() - startTime;
      aiLogger.info('Chat completion successful', {
        model,
        duration,
        tokens: response.data.usage?.total_tokens,
      });

      return response.data;
    } catch (error) {
      aiLogger.error('Chat completion failed', { error });
      throw error;
    }
  }

  async generateTweet(prompt: string, context?: string): Promise<string> {
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are an AI agent that generates tweets based on the user's personality and writing style.
${context ? `Context: ${context}` : ''}

Generate engaging, authentic tweets that match the user's voice. Keep them under 280 characters.
Do not include hashtags unless specifically requested. Write naturally and authentically.`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await this.chat({
      messages,
      temperature: 0.8,
      max_tokens: 100,
    });

    return response.choices[0].message.content.trim();
  }

  async generateReply(tweet: string, conversationContext?: string, personality?: string): Promise<string> {
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are replying to a tweet as an AI agent with the following personality: ${personality || 'friendly, thoughtful, and engaging'}.
${conversationContext ? `Conversation context: ${conversationContext}` : ''}

Generate a natural, authentic reply that continues the conversation. Keep it under 280 characters.
Be conversational, add value, and stay true to your personality.`,
      },
      {
        role: 'user',
        content: `Tweet to reply to: "${tweet}"\n\nGenerate an appropriate reply.`,
      },
    ];

    const response = await this.chat({
      messages,
      temperature: 0.7,
      max_tokens: 100,
    });

    return response.choices[0].message.content.trim();
  }

  async analyzeSentiment(text: string): Promise<{ sentiment: string; score: number; explanation: string }> {
    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are a sentiment analysis expert. Analyze the sentiment of the given text and respond with a JSON object containing: sentiment (positive/negative/neutral), score (0-1), and explanation.',
      },
      {
        role: 'user',
        content: text,
      },
    ];

    const response = await this.chat({
      messages,
      temperature: 0.3,
      max_tokens: 150,
    });

    try {
      return JSON.parse(response.choices[0].message.content);
    } catch {
      return {
        sentiment: 'neutral',
        score: 0.5,
        explanation: 'Unable to parse sentiment',
      };
    }
  }

  async extractTopics(text: string): Promise<string[]> {
    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are a topic extraction expert. Extract the main topics from the given text and return them as a JSON array of strings.',
      },
      {
        role: 'user',
        content: text,
      },
    ];

    const response = await this.chat({
      messages,
      temperature: 0.3,
      max_tokens: 100,
    });

    try {
      return JSON.parse(response.choices[0].message.content);
    } catch {
      return [];
    }
  }

  async shouldEngageWithTweet(tweet: string, personality: string): Promise<{ engage: boolean; reason: string }> {
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are deciding whether to engage with a tweet based on this personality: ${personality}.
Respond with JSON: { "engage": true/false, "reason": "explanation" }`,
      },
      {
        role: 'user',
        content: `Tweet: "${tweet}"\n\nShould I engage with this tweet?`,
      },
    ];

    const response = await this.chat({
      messages,
      temperature: 0.5,
      max_tokens: 100,
    });

    try {
      return JSON.parse(response.choices[0].message.content);
    } catch {
      return { engage: false, reason: 'Unable to determine' };
    }
  }
}

export const openRouterClient = new OpenRouterClient();
