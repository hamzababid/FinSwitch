/**
 * Audit Logger Service
 * Records routing rule changes to audit_logs collection
 * Implements Requirement 10.3
 */

import { v4 as uuidv4 } from 'uuid';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../utils/logger';
import { IRoutingRule } from '../models/RoutingRule';

export enum AuditAction {
  ROUTING_RULE_CREATED = 'ROUTING_RULE_CREATED',
  ROUTING_RULE_UPDATED = 'ROUTING_RULE_UPDATED',
  ROUTING_RULE_DELETED = 'ROUTING_RULE_DELETED',
  ROUTING_RULE_ENABLED = 'ROUTING_RULE_ENABLED',
  ROUTING_RULE_DISABLED = 'ROUTING_RULE_DISABLED',
}

export enum EntityType {
  ROUTING_RULE = 'ROUTING_RULE',
}

export interface AuditLogEntry {
  userId: string;
  username: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  changes?: {
    before?: any;
    after?: any;
  };
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
  };
}

export class AuditLogger {
  /**
   * Log a routing rule action to the audit_logs collection
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const auditLog = new AuditLog({
        auditId: uuidv4(),
        userId: entry.userId,
        username: entry.username,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        changes: entry.changes,
        metadata: entry.metadata,
        timestamp: new Date(),
      });

      await auditLog.save();

      logger.info('Audit log created', {
        auditId: auditLog.auditId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
      });
    } catch (error: any) {
      // Log error but don't throw - audit logging should not break the main flow
      logger.error('Failed to create audit log', error, {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
      });
    }
  }

  /**
   * Log routing rule creation
   */
  async logRuleCreated(
    actorUserId: string,
    actorUsername: string,
    rule: IRoutingRule,
    metadata?: { ipAddress?: string; userAgent?: string; correlationId?: string }
  ): Promise<void> {
    await this.log({
      userId: actorUserId,
      username: actorUsername,
      action: AuditAction.ROUTING_RULE_CREATED,
      entityType: EntityType.ROUTING_RULE,
      entityId: rule.ruleId,
      changes: {
        after: {
          ruleId: rule.ruleId,
          name: rule.name,
          priority: rule.priority,
          enabled: rule.enabled,
          conditions: rule.conditions,
          route: rule.route,
        },
      },
      metadata,
    });
  }

  /**
   * Log routing rule update
   */
  async logRuleUpdated(
    actorUserId: string,
    actorUsername: string,
    ruleId: string,
    before: IRoutingRule,
    after: IRoutingRule,
    metadata?: { ipAddress?: string; userAgent?: string; correlationId?: string }
  ): Promise<void> {
    await this.log({
      userId: actorUserId,
      username: actorUsername,
      action: AuditAction.ROUTING_RULE_UPDATED,
      entityType: EntityType.ROUTING_RULE,
      entityId: ruleId,
      changes: {
        before: {
          name: before.name,
          priority: before.priority,
          enabled: before.enabled,
          conditions: before.conditions,
          route: before.route,
        },
        after: {
          name: after.name,
          priority: after.priority,
          enabled: after.enabled,
          conditions: after.conditions,
          route: after.route,
        },
      },
      metadata,
    });
  }

  /**
   * Log routing rule deletion
   */
  async logRuleDeleted(
    actorUserId: string,
    actorUsername: string,
    rule: IRoutingRule,
    metadata?: { ipAddress?: string; userAgent?: string; correlationId?: string }
  ): Promise<void> {
    await this.log({
      userId: actorUserId,
      username: actorUsername,
      action: AuditAction.ROUTING_RULE_DELETED,
      entityType: EntityType.ROUTING_RULE,
      entityId: rule.ruleId,
      changes: {
        before: {
          ruleId: rule.ruleId,
          name: rule.name,
          priority: rule.priority,
          enabled: rule.enabled,
          conditions: rule.conditions,
          route: rule.route,
        },
      },
      metadata,
    });
  }
}
