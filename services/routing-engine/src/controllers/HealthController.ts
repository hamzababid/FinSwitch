/**
 * Health Controller
 * Handles health check and metrics endpoints
 * Implements Requirements 13.3
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { redisClient } from '../cache/RedisClient';
import { logger } from '../utils/logger';

export class HealthController {
  /**
   * GET /health
   * Health check with MongoDB and Redis connectivity
   */
  health = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const health = {
        status: 'healthy',
        service: 'routing-engine',
        timestamp: new Date().toISOString(),
        checks: {
          mongodb: 'unknown',
          redis: 'unknown',
        },
      };

      // Check MongoDB
      try {
        if (mongoose.connection.readyState === 1) {
          health.checks.mongodb = 'healthy';
        } else {
          health.checks.mongodb = 'unhealthy';
          health.status = 'degraded';
        }
      } catch (error) {
        health.checks.mongodb = 'unhealthy';
        health.status = 'degraded';
      }

      // Check Redis
      try {
        const client = redisClient.getClient();
        await client.ping();
        health.checks.redis = 'healthy';
      } catch (error) {
        health.checks.redis = 'unhealthy';
        health.status = 'degraded';
      }

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /metrics
   * Service metrics including cache hit rate and evaluation time
   */
  metrics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get cache stats
      const cacheStats = await this.getCacheMetrics();

      const metrics = {
        service: 'routing-engine',
        timestamp: new Date().toISOString(),
        cache: cacheStats,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };

      res.status(200).json(metrics);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get cache metrics from Redis
   */
  private async getCacheMetrics() {
    try {
      const client = redisClient.getClient();
      const info = await client.info('stats');
      const lines = info.split('\r\n');
      const stats: any = {};

      for (const line of lines) {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          stats[key] = value;
        }
      }

      return {
        hits: parseInt(stats.keyspace_hits || '0'),
        misses: parseInt(stats.keyspace_misses || '0'),
        hitRate: stats.keyspace_hits && stats.keyspace_misses
          ? (parseInt(stats.keyspace_hits) / (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses)) * 100).toFixed(2) + '%'
          : 'N/A',
      };
    } catch (error) {
      logger.error('Failed to get cache metrics', error);
      return {
        hits: 0,
        misses: 0,
        hitRate: 'N/A',
      };
    }
  }
}
