import { ChromaClient, Collection } from 'chromadb';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface Memory {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
}

class VectorDBService {
  private client: ChromaClient;
  private collection: Collection | null = null;
  private collectionName: string;

  constructor() {
    this.collectionName = config.chromadb.collection;
    this.client = new ChromaClient({
      path: `http://${config.chromadb.host}:${config.chromadb.port}`,
    });
  }

  async initialize(): Promise<void> {
    try {
      // Get or create collection
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { description: 'SocialX agent memories and learned patterns' },
      });

      logger.info('ChromaDB collection initialized', {
        name: this.collectionName,
      });
    } catch (error) {
      logger.error('Failed to initialize ChromaDB collection', { error });
      throw error;
    }
  }

  async addMemory(memory: Memory): Promise<void> {
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }

    try {
      await this.collection.add({
        ids: [memory.id],
        documents: [memory.content],
        metadatas: [memory.metadata],
        embeddings: memory.embedding ? [memory.embedding] : undefined,
      });

      logger.debug('Memory added to vector DB', { id: memory.id });
    } catch (error) {
      logger.error('Failed to add memory', { error, memoryId: memory.id });
      throw error;
    }
  }

  async addMemories(memories: Memory[]): Promise<void> {
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }

    try {
      await this.collection.add({
        ids: memories.map(m => m.id),
        documents: memories.map(m => m.content),
        metadatas: memories.map(m => m.metadata),
        embeddings: memories[0].embedding ? memories.map(m => m.embedding!) : undefined,
      });

      logger.debug('Batch memories added to vector DB', { count: memories.length });
    } catch (error) {
      logger.error('Failed to add memories', { error });
      throw error;
    }
  }

  async searchSimilar(query: string, nResults: number = 5): Promise<Memory[]> {
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }

    try {
      const results = await this.collection.query({
        queryTexts: [query],
        nResults,
      });

      if (!results.ids || !results.ids[0]) {
        return [];
      }

      const memories: Memory[] = results.ids[0].map((id, index) => ({
        id,
        content: results.documents?.[0]?.[index] || '',
        metadata: (results.metadatas?.[0]?.[index] as Record<string, unknown>) || {},
        embedding: results.embeddings?.[0]?.[index],
      }));

      logger.debug('Similar memories retrieved', {
        query,
        resultsCount: memories.length,
      });

      return memories;
    } catch (error) {
      logger.error('Failed to search similar memories', { error, query });
      throw error;
    }
  }

  async getMemory(id: string): Promise<Memory | null> {
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }

    try {
      const result = await this.collection.get({
        ids: [id],
      });

      if (!result.ids || result.ids.length === 0) {
        return null;
      }

      return {
        id: result.ids[0],
        content: result.documents?.[0] || '',
        metadata: (result.metadatas?.[0] as Record<string, unknown>) || {},
        embedding: result.embeddings?.[0],
      };
    } catch (error) {
      logger.error('Failed to get memory', { error, id });
      return null;
    }
  }

  async deleteMemory(id: string): Promise<void> {
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }

    try {
      await this.collection.delete({
        ids: [id],
      });

      logger.debug('Memory deleted', { id });
    } catch (error) {
      logger.error('Failed to delete memory', { error, id });
      throw error;
    }
  }

  async updateMemory(id: string, content: string, metadata: Record<string, unknown>): Promise<void> {
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }

    try {
      await this.collection.update({
        ids: [id],
        documents: [content],
        metadatas: [metadata],
      });

      logger.debug('Memory updated', { id });
    } catch (error) {
      logger.error('Failed to update memory', { error, id });
      throw error;
    }
  }

  async count(): Promise<number> {
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }

    try {
      const result = await this.collection.count();
      return result;
    } catch (error) {
      logger.error('Failed to count memories', { error });
      return 0;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.heartbeat();
      return true;
    } catch (error) {
      logger.error('ChromaDB health check failed', { error });
      return false;
    }
  }
}

export const vectorDBService = new VectorDBService();
