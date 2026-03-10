/**
 * Routing Rule Cache Service
 * Implements cache-aside pattern for routing rule retrieval
 * Implements Requirements 12.6
 */

import { CacheManager } from '../cache/CacheManager';
import { RoutingRuleRepository } from '../repositories/RoutingRuleRepository';
import { IRoutingRule } from '../models/RoutingRule';
import { logger } from '../utils/logger';

export class RoutingRuleCacheService {
  private cacheManager: CacheManager;
  private repository: RoutingRuleRepository;
  private readonly ENABLED_RULES_KEY = 'enabled_rules';

  constructor() {
    this.cacheManager = new CacheManager();
    this.repository = new RoutingRuleRepository();
  }

  /**
   * Get all enabled routing rules with cache-aside pattern
   * 1. Try to get from cache
   * 2. If cache miss, get from database
   * 3. Store in cache for future requests
   */
  async getEnabledRules(): Promise<IRoutingRule[]> {
    try {
      // Try cache first
      const cached = await this.cacheManager.get(this.ENABLED_RULES_KEY);
      
      if (cached) {
        logger.debug('Returning enabled rules from cache');
        return cached;
      }

      // Cache miss - get from database
      logger.debug('Cache miss - fetching enabled rules from database');
      const rules = await this.repository.findAllEnabled();

      // Store in cache for future requests
      if (rules.length > 0) {
        await this.cacheManager.set(this.ENABLED_RULES_KEY, rules);
        logger.debug('Enabled rules cached', { count: rules.length });
      }

      return rules;
    } catch (error: any) {
      logger.error('Failed to get enabled rules', error);
      throw error;
    }
  }

  /**
   * Invalidate enabled rules cache
   * Should be called when rules are created, updated, or deleted
   */
  async invalidateEnabledRulesCache(): Promise<void> {
    try {
      await this.cacheManager.invalidate(this.ENABLED_RULES_KEY);
      logger.info('Enabled rules cache invalidated');
    } catch (error: any) {
      logger.error('Failed to invalidate enabled rules cache', error);
      // Don't throw - cache invalidation failure shouldn't break the operation
    }
  }

  /**
   * Invalidate all routing caches
   */
  async invalidateAllCaches(): Promise<void> {
    try {
      await this.cacheManager.invalidateAll();
      logger.info('All routing caches invalidated');
    } catch (error: any) {
      logger.error('Failed to invalidate all caches', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    available: boolean;
    totalKeys: number;
    memoryUsage: string;
    enabledRulesTTL: number;
  }> {
    try {
      const stats = await this.cacheManager.getStats();
      const ttl = await this.cacheManager.getTTL(this.ENABLED_RULES_KEY);

      return {
        available: this.cacheManager.isAvailable(),
        totalKeys: stats.totalKeys,
        memoryUsage: stats.memoryUsage,
        enabledRulesTTL: ttl,
      };
    } catch (error: any) {
      logger.error('Failed to get cache stats', error);
      return {
        available: false,
        totalKeys: 0,
        memoryUsage: 'N/A',
        enabledRulesTTL: -1,
      };
    }
  }

  /**
   * Warm up cache by pre-loading enabled rules
   */
  async warmUpCache(): Promise<void> {
    try {
      logger.info('Warming up routing rules cache');
      await this.getEnabledRules();
      logger.info('Cache warm-up completed');
    } catch (error: any) {
      logger.error('Failed to warm up cache', error);
      // Don't throw - cache warm-up failure shouldn't prevent service startup
    }
  }

  /**
   * Check if cache is available
   */
  isCacheAvailable(): boolean {
    return this.cacheManager.isAvailable();
  }
}
