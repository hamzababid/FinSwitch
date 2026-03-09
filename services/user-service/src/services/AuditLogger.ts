/**
 * Audit Logger Service
 * Records user actions to audit_logs collection
 * Implements Requirement 10.2
 */

import { v4 as uuidv4 } from 'uuid';
import { AuditLog, IAuditLog } from '../models/AuditLog';
import { logger } from '../utils/logger';

export enum AuditAction {
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_LOGIN_SUCCESS = 'USER_LOGIN_SUCCESS',
  USER_LOGIN_FAILED = 'USER_LOGIN_FAILED',
  USER_VIEWED = 'USER_VIEWED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REMOVED = 'ROLE_REMOVED',
}

export enum EntityType {
  USER = 'USER',
  ROLE = 'ROLE',
  AUTH = 'AUTH',
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
   * Log a user action to the audit_logs collection
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
   * Log user creation
   */
  async logUserCreated(
    actorUserId: string,
    actorUsername: string,
    createdUser: any,
    metadata?: { ipAddress?: string; userAgent?: string; correlationId?: string }
  ): Promise<void> {
    await this.log({
      userId: actorUserId,
      username: actorUsername,
      action: AuditAction.USER_CREATED,
      entityType: EntityType.USER,
      entityId: createdUser.userId,
      changes: {
        after: {
          userId: createdUser.userId,
          username: createdUser.username,
          email: createdUser.email,
          roles: createdUser.roles,
          isActive: createdUser.isActive,
        },
      },
      metadata,
    });
  }

  /**
   * Log user update
   */
  async logUserUpdated(
    actorUserId: string,
    actorUsername: string,
    userId: string,
    before: any,
    after: any,
    metadata?: { ipAddress?: string; userAgent?: string; correlationId?: string }
  ): Promise<void> {
    await this.log({
      userId: actorUserId,
      username: actorUsername,
      action: AuditAction.USER_UPDATED,
      entityType: EntityType.USER,
      entityId: userId,
      changes: {
        before: {
          email: before.email,
          roles: before.roles,
          isActive: before.isActive,
        },
        after: {
          email: after.email,
          roles: after.roles,
          isActive: after.isActive,
        },
      },
      metadata,
    });
  }

  /**
   * Log user deactivation
   */
  async logUserDeactivated(
    actorUserId: string,
    actorUsername: string,
    deactivatedUser: any,
    metadata?: { ipAddress?: string; userAgent?: string; correlationId?: string }
  ): Promise<void> {
    await this.log({
      userId: actorUserId,
      username: actorUsername,
      action: AuditAction.USER_DEACTIVATED,
      entityType: EntityType.USER,
      entityId: deactivatedUser.userId,
      changes: {
        before: {
          isActive: true,
        },
        after: {
          isActive: false,
        },
      },
      metadata,
    });
  }

  /**
   * Log successful login
   */
  async logLoginSuccess(
    userId: string,
    username: string,
    metadata?: { ipAddress?: string; userAgent?: string; correlationId?: string }
  ): Promise<void> {
    await this.log({
      userId,
      username,
      action: AuditAction.USER_LOGIN_SUCCESS,
      entityType: EntityType.AUTH,
      entityId: userId,
      metadata,
    });
  }

  /**
   * Log failed login attempt
   */
  async logLoginFailed(
    username: string,
    reason: string,
    metadata?: { ipAddress?: string; userAgent?: string; correlationId?: string }
  ): Promise<void> {
    await this.log({
      userId: 'unknown',
      username,
      action: AuditAction.USER_LOGIN_FAILED,
      entityType: EntityType.AUTH,
      entityId: username,
      changes: {
        after: {
          reason,
        },
      },
      metadata,
    });
  }

  /**
   * Log user view
   */
  async logUserViewed(
    actorUserId: string,
    actorUsername: string,
    viewedUserId: string,
    metadata?: { ipAddress?: string; userAgent?: string; correlationId?: string }
  ): Promise<void> {
    await this.log({
      userId: actorUserId,
      username: actorUsername,
      action: AuditAction.USER_VIEWED,
      entityType: EntityType.USER,
      entityId: viewedUserId,
      metadata,
    });
  }

  /**
   * Query audit logs with filters
   */
  async query(filters: {
    userId?: string;
    action?: AuditAction;
    entityType?: EntityType;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ logs: IAuditLog[]; total: number }> {
    try {
      const query: any = {};

      if (filters.userId) {
        query.userId = filters.userId;
      }
      if (filters.action) {
        query.action = filters.action;
      }
      if (filters.entityType) {
        query.entityType = filters.entityType;
      }
      if (filters.entityId) {
        query.entityId = filters.entityId;
      }
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) {
          query.timestamp.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.timestamp.$lte = filters.endDate;
        }
      }

      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit),
        AuditLog.countDocuments(query),
      ]);

      return { logs, total };
    } catch (error: any) {
      logger.error('Failed to query audit logs', error, filters);
      throw error;
    }
  }
}
