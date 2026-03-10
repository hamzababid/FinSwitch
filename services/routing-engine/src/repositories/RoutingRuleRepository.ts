/**
 * Routing Rule Repository
 * Data access layer for routing rules
 * Implements Requirements 2.6
 */

import { RoutingRule, IRoutingRule } from '../models/RoutingRule';
import { logger } from '../utils/logger';

export interface CreateRoutingRuleDTO {
  ruleId: string;
  name: string;
  description?: string;
  priority: number;
  enabled?: boolean;
  conditions: {
    cardBinRanges?: string[];
    amountRange?: {
      min?: number;
      max?: number;
    };
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

export interface UpdateRoutingRuleDTO {
  name?: string;
  description?: string;
  priority?: number;
  enabled?: boolean;
  conditions?: {
    cardBinRanges?: string[];
    amountRange?: {
      min?: number;
      max?: number;
    };
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

export class RoutingRuleRepository {
  /**
   * Create a new routing rule
   */
  async create(dto: CreateRoutingRuleDTO): Promise<IRoutingRule> {
    try {
      const rule = new RoutingRule({
        ruleId: dto.ruleId,
        name: dto.name,
        description: dto.description,
        priority: dto.priority,
        enabled: dto.enabled ?? true,
        conditions: dto.conditions,
        route: dto.route,
        metadata: {
          createdBy: dto.createdBy,
          lastModifiedBy: dto.createdBy,
        },
      });

      await rule.save();
      logger.debug('Routing rule created', { ruleId: rule.ruleId });
      return rule;
    } catch (error: any) {
      logger.error('Failed to create routing rule', error);
      throw error;
    }
  }

  /**
   * Find routing rule by ID
   */
  async findById(ruleId: string): Promise<IRoutingRule | null> {
    try {
      const rule = await RoutingRule.findOne({ ruleId });
      return rule;
    } catch (error: any) {
      logger.error('Failed to find routing rule by ID', error, { ruleId });
      throw error;
    }
  }

  /**
   * Find all enabled routing rules ordered by priority (highest first)
   */
  async findAllEnabled(): Promise<IRoutingRule[]> {
    try {
      const rules = await RoutingRule.find({ enabled: true })
        .sort({ priority: -1 })
        .exec();
      return rules;
    } catch (error: any) {
      logger.error('Failed to find enabled routing rules', error);
      throw error;
    }
  }

  /**
   * Find all routing rules with pagination
   */
  async findAll(page: number = 1, limit: number = 50): Promise<{ rules: IRoutingRule[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      
      const [rules, total] = await Promise.all([
        RoutingRule.find()
          .sort({ priority: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        RoutingRule.countDocuments(),
      ]);

      return { rules, total };
    } catch (error: any) {
      logger.error('Failed to find all routing rules', error);
      throw error;
    }
  }

  /**
   * Update routing rule
   */
  async update(ruleId: string, dto: UpdateRoutingRuleDTO): Promise<IRoutingRule | null> {
    try {
      const updateData: any = {
        'metadata.lastModifiedBy': dto.lastModifiedBy,
      };

      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.priority !== undefined) updateData.priority = dto.priority;
      if (dto.enabled !== undefined) updateData.enabled = dto.enabled;
      if (dto.conditions !== undefined) updateData.conditions = dto.conditions;
      if (dto.route !== undefined) {
        // Merge route fields
        if (dto.route.issuerEndpoint !== undefined) updateData['route.issuerEndpoint'] = dto.route.issuerEndpoint;
        if (dto.route.processorId !== undefined) updateData['route.processorId'] = dto.route.processorId;
        if (dto.route.timeout !== undefined) updateData['route.timeout'] = dto.route.timeout;
        if (dto.route.retryAttempts !== undefined) updateData['route.retryAttempts'] = dto.route.retryAttempts;
      }

      const rule = await RoutingRule.findOneAndUpdate(
        { ruleId },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (rule) {
        logger.debug('Routing rule updated', { ruleId });
      }

      return rule;
    } catch (error: any) {
      logger.error('Failed to update routing rule', error, { ruleId });
      throw error;
    }
  }

  /**
   * Delete routing rule (hard delete)
   */
  async delete(ruleId: string): Promise<boolean> {
    try {
      const result = await RoutingRule.deleteOne({ ruleId });
      const deleted = result.deletedCount > 0;
      
      if (deleted) {
        logger.debug('Routing rule deleted', { ruleId });
      }

      return deleted;
    } catch (error: any) {
      logger.error('Failed to delete routing rule', error, { ruleId });
      throw error;
    }
  }

  /**
   * Disable routing rule (soft delete)
   */
  async disable(ruleId: string, disabledBy: string): Promise<boolean> {
    try {
      const result = await RoutingRule.updateOne(
        { ruleId },
        {
          $set: {
            enabled: false,
            'metadata.lastModifiedBy': disabledBy,
          },
        }
      );

      const disabled = result.modifiedCount > 0;
      
      if (disabled) {
        logger.debug('Routing rule disabled', { ruleId, disabledBy });
      }

      return disabled;
    } catch (error: any) {
      logger.error('Failed to disable routing rule', error, { ruleId });
      throw error;
    }
  }

  /**
   * Check if rule ID exists
   */
  async ruleIdExists(ruleId: string): Promise<boolean> {
    try {
      const count = await RoutingRule.countDocuments({ ruleId });
      return count > 0;
    } catch (error: any) {
      logger.error('Failed to check if rule ID exists', error, { ruleId });
      throw error;
    }
  }

  /**
   * Find rules by priority range
   */
  async findByPriorityRange(minPriority: number, maxPriority: number): Promise<IRoutingRule[]> {
    try {
      const rules = await RoutingRule.find({
        priority: { $gte: minPriority, $lte: maxPriority },
        enabled: true,
      })
        .sort({ priority: -1 })
        .exec();
      
      return rules;
    } catch (error: any) {
      logger.error('Failed to find rules by priority range', error, { minPriority, maxPriority });
      throw error;
    }
  }

  /**
   * Count total rules
   */
  async count(): Promise<number> {
    try {
      return await RoutingRule.countDocuments();
    } catch (error: any) {
      logger.error('Failed to count routing rules', error);
      throw error;
    }
  }

  /**
   * Count enabled rules
   */
  async countEnabled(): Promise<number> {
    try {
      return await RoutingRule.countDocuments({ enabled: true });
    } catch (error: any) {
      logger.error('Failed to count enabled routing rules', error);
      throw error;
    }
  }
}
