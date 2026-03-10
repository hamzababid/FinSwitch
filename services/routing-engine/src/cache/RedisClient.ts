/**
 * Redis Client
 * Manages Redis connection and operations
 */

import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

export class RedisClient {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    try {
      this.client = createClient({
        url: config.redis.url,
      });

      this.client.on('error', (error) => {
        logger.error('Redis client error', error);
      });

      this.client.on('connect', () => {
        logger.info('Redis client connecting');
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        logger.warn('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      logger.info('Connected to Redis', {
        url: config.redis.url.replace(/:[^:@]+@/, ':***@'), // Mask password
      });
    } catch (error) {
      logger.error('Failed to connect to Redis', error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Disconnected from Redis');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis', error as Error);
      throw error;
    }
  }

  getClient(): RedisClientType {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client is not connected');
    }
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }
}

// Singleton instance
export const redisClient = new RedisClient();
