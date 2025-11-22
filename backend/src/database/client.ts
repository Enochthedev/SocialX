import { Pool, PoolClient } from 'pg';
import { config } from '../config';
import { dbLogger } from '../utils/logger';

class DatabaseClient {
  private pool: Pool;
  private static instance: DatabaseClient;

  private constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      dbLogger.error('Unexpected database pool error', { error: err });
    });

    this.pool.on('connect', () => {
      dbLogger.debug('New database connection established');
    });
  }

  public static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  public async query(text: string, params?: unknown[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      dbLogger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      dbLogger.error('Query error', { text, error });
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    const client = await this.pool.connect();
    return client;
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      dbLogger.error('Database health check failed', { error });
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    dbLogger.info('Database pool closed');
  }
}

export const db = DatabaseClient.getInstance();
