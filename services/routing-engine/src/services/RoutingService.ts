/**
 * Routing Service
 * Business logic for routing operations
 * Implements Requirements 2.1, 2.2
 */

import { v4 as uuidv4 } from 'uuid';
import { RoutingRuleRepository } from '../repositories/RoutingRuleRepository';
import { RoutingRuleCacheService } from './RoutingRuleCacheService';
import { RuleEvaluator, TransactionContext, RoutingDecision } from './RuleEvaluator';
import { IRoutingRule } from '../models/RoutingRule';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError, DatabaseError } from '@finswitch/shared';
import { AuditLogger } from './AuditLogger';

export interface CreateRuleDTO {
  name: string;
  description?: string;
  priority: number;
  enabled?: boolean;
  conditions: {
    cardBinRanges?: string[];
    amountRange?: { min?: number; max?: number };
    merchantIds?: string[];
    currencies?: string[];
    transactionTypes?: string[];
  };
  route: {
    issuerEndpoint: string;
    processorId: string;
    timeout?: number;
    retryAttempts?: number;
  };
  createdBy: string;
}

export interface UpdateRuleDTO {
  name?: string;
  description?: string;
  priority?: number;
  enabled?: boolean;
  conditions?: {
    cardBinRanges?: string[];
    amountRange?: { min?: number; max?: number };
    merchantIds?: string[];
    currencies?: string[];
    transactionTypes?: string[];
  };
  route?: {
    issuerEndpoint?: string;
    processorId?: string;
    timeout?: number;
    retryAttempts?: number;
  };
  lastModifiedBy: string;
}

export class RoutingService {
  private repository: RoutingRuleRepository;
  private cacheService: RoutingRuleCacheService;
  private evaluator: RuleEvaluator;
  private auditLogger: AuditLogger;

  constructor() {
    this.repository = new RoutingRuleRepository();
    this.cacheService = new RoutingRuleCacheService();
    this.evaluator = new RuleEvaluator();
    this.auditLogger = new AuditLogger();
  }

  /**
   * Evaluate routing for a transaction
   */
  async evaluateRouting(transaction: TransactionContext): Promise<RoutingDecision> {
    // Validate transaction
    const validation = this.evaluator.validateTransaction(transaction);
    if (!validation.valid) {
      throw new ValidationError(
        `Invalid transaction: ${validation.errors.join(', ')}`,
        'transaction'
      );
    }

    // Get enabled rules (from cache or database)
    const rules = await this.cacheService.getEnabledRules();

    // Evaluate rules
    const decision = this.evaluator.evaluate(transaction, rules);

    logger.info('Routing decision made', {
      matched: decision.matched,
      ruleId: decision.rule?.ruleId,
      fallback: decision.fallback,
      processorId: decision.route?.processorId,
    });

    return decision;
  }

  /**
   * Create a new routing rule
   */
  async createRule(dto: CreateRuleDTO, metadata?: { ipAddress?: string; userAgent?: string; correlationId?: string }): Promise<IRoutingRule> {
    // Validate required fields
    this.validateCreateRule(dto);

    // Generate rule ID
    const ruleId = uuidv4();

    // Create rule
    const rule = await this.repository.create({
      ruleId,
      name: dto.name,
      description: dto.description,
      priority: dto.priority,
      enabled: dto.enabled,
      conditions: dto.conditions,
      route: dto.route,
      createdBy: dto.createdBy,
    });

    logger.info('Routing rule created', {
      ruleId: rule.ruleId,
      name: rule.name,
      priority: rule.priority,
    });

    // Audit log
    await this.auditLogger.logRuleCreated(dto.createdBy, dto.createdBy, rule, metadata);

    // Invalidate cache
    await this.cacheService.invalidateEnabledRulesCache();

    return rule;
  }

  /**
   * Get all routing rules with pagination
   */
  async listRules(page: number, limit: number): Promise<{ rules: IRoutingRule[]; total: number; page: number; totalPages: number }> {
    if (page < 1) {
      throw new ValidationError('Page must be greater than 0', 'page');
    }
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100', 'limit');
    }

    const { rules, total } = await this.repository.findAll(page, limit);

    return {
      rules,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get routing rule by ID
   */
  async getRuleById(ruleId: string): Promise<IRoutingRule> {
    const rule = await this.repository.findById(ruleId);

    if (!rule) {
      throw new NotFoundError('Routing rule', ruleId);
    }

    return rule;
  }

  /**
   * Update routing rule
   */
  async updateRule(ruleId: string, dto: UpdateRuleDTO, metadata?: { ipAddress?: string; userAgent?: string; correlationId?: string }): Promise<IRoutingRule> {
    // Check if rule exists
    const existingRule = await this.repository.findById(ruleId);
    if (!existingRule) {
      throw new NotFoundError('Routing rule', ruleId);
    }

    // Validate update data
    this.validateUpdateRule(dto);

    // Update rule
    const updatedRule = await this.repository.update(ruleId, dto);

    if (!updatedRule) {
      throw new DatabaseError('Failed to update routing rule');
    }

    logger.info('Routing rule updated', {
      ruleId: updatedRule.ruleId,
      name: updatedRule.name,
      lastModifiedBy: dto.lastModifiedBy,
    });

    // Audit log
    await this.auditLogger.logRuleUpdated(dto.lastModifiedBy, dto.lastModifiedBy, ruleId, existingRule, updatedRule, metadata);

    // Invalidate cache
    await this.cacheService.invalidateEnabledRulesCache();

    return updatedRule;
  }

  /**
   * Delete routing rule
   */
  async deleteRule(ruleId: string, deletedBy: string, metadata?: { ipAddress?: string; userAgent?: string; correlationId?: string }): Promise<void> {
    // Check if rule exists
    const existingRule = await this.repository.findById(ruleId);
    if (!existingRule) {
      throw new NotFoundError('Routing rule', ruleId);
    }

    // Audit log before deletion
    await this.auditLogger.logRuleDeleted(deletedBy, deletedBy, existingRule, metadata);

    // Delete rule
    const deleted = await this.repository.delete(ruleId);

    if (!deleted) {
      throw new DatabaseError('Failed to delete routing rule');
    }

    logger.info('Routing rule deleted', { ruleId });

    // Invalidate cache
    await this.cacheService.invalidateEnabledRulesCache();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return await this.cacheService.getCacheStats();
  }

  /**
   * Validation helpers
   */
  private validateCreateRule(dto: CreateRuleDTO): void {
    if (!dto.name || dto.name.trim().length < 3) {
      throw new ValidationError('Rule name must be at least 3 characters', 'name');
    }

    if (dto.priority === undefined || dto.priority < 0 || dto.priority > 1000) {
      throw new ValidationError('Priority must be between 0 and 1000', 'priority');
    }

    if (!dto.route || !dto.route.issuerEndpoint || !dto.route.processorId) {
      throw new ValidationError('Route must include issuerEndpoint and processorId', 'route');
    }

    if (!dto.createdBy) {
      throw new ValidationError('createdBy is required', 'createdBy');
    }
  }

  private validateUpdateRule(dto: UpdateRuleDTO): void {
    if (dto.name !== undefined && dto.name.trim().length < 3) {
      throw new ValidationError('Rule name must be at least 3 characters', 'name');
    }

    if (dto.priority !== undefined && (dto.priority < 0 || dto.priority > 1000)) {
      throw new ValidationError('Priority must be between 0 and 1000', 'priority');
    }

    if (!dto.lastModifiedBy) {
      throw new ValidationError('lastModifiedBy is required', 'lastModifiedBy');
    }
  }
}
