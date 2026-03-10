/**
 * Cache Manager
 * Implements cache-aside pattern for routing rules
 * Implements Requirements 12.6
 */

import { redisClient } from './RedisClient';
import { config } from '../config';
import { logger } from '../utils/logger';
import { IRoutingRule } from '../models/RoutingRule';

export class CacheManager {
  private readonly ttl: number;
  private readonly keyPrefix: string = 'routing:';

  constructor() {
    this.ttl = config.cache.ttl;
  }

  /**
   * Get cached routing rules
   */
  async get(key: string): Promise<IRoutingRule[] | null> {
    try {
      if (!redisClient.isReady()) {
        logger.warn('Redis client not ready, skipping cache get');
        return null;
      }

      const client = redisClient.getClient();
      const cacheKey = this.keyPrefix + key;
      const cached = await client.get(cacheKey);

      if (cached) {
        logger.debug('Cache hit', { key: cacheKey });
        return JSON.parse(cached);
      }

      logger.debug('Cache miss', { key: cacheKey });
      return null;
    } catch (error: any) {
      logger.error('Failed to get from cache', error, { key });
      // Return null on cache errors to fall back to database
      return null;
    }
  }

  /**
   * Set routing rules in cache with TTL
   */
  async set(key: string, value: IRoutingRule[]): Promise<void> {
    try {
      if (!redisClient.isReady()) {
        logger.warn('Redis client not ready, skipping cache set');
        return;
      }

      const client = redisClient.getClient();
      const cacheKey = this.keyPrefix + key;
      const serialized = JSON.stringify(value);

      await client.setEx(cacheKey, this.ttl, serialized);
      logger.debug('Cache set', { key: cacheKey, ttl: this.ttl });
    } catch (error: any) {
      logger.error('Failed to set cache', error, { key });
      // Don't throw error, just log it
    }
  }

  /**
   * Invalidate cache for a specific key
   */
  async invalidate(key: string): Promise<void> {
    try {
      if (!redisClient.isReady()) {
        logger.warn('Redis client not ready, skipping cache invalidation');
        return;
      }

      const client = redisClient.getClient();
      const cacheKey = this.keyPrefix + key;
      await client.del(cacheKey);
      logger.debug('Cache invalidated', { key: cacheKey });
    } catch (error: any) {
      logger.error('Failed to invalidate cache', error, { key });
      // Don't throw error, just log it
    }
  }

  /**
   * Invalidate all routing rule caches
   */
  async invalidateAll(): Promise<void> {
    try {
      if (!redisClient.isReady()) {
        logger.warn('Redis client not ready, skipping cache invalidation');
        return;
      }

      const client = redisClient.getClient();
      const pattern = this.keyPrefix + '*';
      
      // Get all keys matching the pattern
      const keys = await client.keys(pattern);
      
      if (keys.length > 0) {
        await client.del(keys);
        logger.info('All routing caches invalidated', { count: keys.length });
      }
    } catch (error: any) {
      logger.error('Failed to invalidate all caches', error);
      // Don't throw error, just log it
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ totalKeys: number; memoryUsage: string }> {
    try {
      if (!redisClient.isReady()) {
        return { totalKeys: 0, memoryUsage: 'N/A' };
      }

      const client = redisClient.getClient();
      const pattern = this.keyPrefix + '*';
      const keys = await client.keys(pattern);
      
      const info = await client.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'N/A';

      return {
        totalKeys: keys.length,
        memoryUsage,
      };
    } catch (error: any) {
      logger.error('Failed to get cache stats', error);
      return { totalKeys: 0, memoryUsage: 'N/A' };
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return redisClient.isReady();
  }

  /**
   * Get TTL for a specific key
   */
  async getTTL(key: string): Promise<number> {
    try {
      if (!redisClient.isReady()) {
        return -1;
      }

      const client = redisClient.getClient();
      const cacheKey = this.keyPrefix + key;
      return await client.ttl(cacheKey);
    } catch (error: any) {
      logger.error('Failed to get TTL', error, { key });
      return -1;
    }
  }

  /**
   * Extend TTL for a specific key
   */
  async extendTTL(key: string, additionalSeconds: number): Promise<void> {
    try {
      if (!redisClient.isReady()) {
        return;
      }

      const client = redisClient.getClient();
      const cacheKey = this.keyPrefix + key;
      const currentTTL = await client.ttl(cacheKey);
      
      if (currentTTL > 0) {
        await client.expire(cacheKey, currentTTL + additionalSeconds);
        logger.debug('Cache TTL extended', { key: cacheKey, additionalSeconds });
      }
    } catch (error: any) {
      logger.error('Failed to extend TTL', error, { key });
    }
  }
}
