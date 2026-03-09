/**
 * Metrics Service
 * Collects and provides service metrics
 * Implements Requirement 13.3
 */

import { AuditLog } from '../models/AuditLog';
import { User } from '../models/User';
import { logger } from '../utils/logger';

export interface ServiceMetrics {
  service: string;
  uptime: number;
  timestamp: string;
  users: {
    total: number;
    active: number;
  };
  authentication: {
    successfulLogins24h: number;
    failedLogins24h: number;
    successRate: number;
  };
  auditLogs: {
    total: number;
    last24h: number;
  };
}

export class MetricsService {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Get comprehensive service metrics
   */
  async getMetrics(): Promise<ServiceMetrics> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get user counts
      const [totalUsers, activeUsers] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ isActive: true }),
      ]);

      // Get authentication metrics for last 24 hours
      const [successfulLogins, failedLogins] = await Promise.all([
        AuditLog.countDocuments({
          action: 'USER_LOGIN_SUCCESS',
          timestamp: { $gte: yesterday },
        }),
        AuditLog.countDocuments({
          action: 'USER_LOGIN_FAILED',
          timestamp: { $gte: yesterday },
        }),
      ]);

      const totalLogins = successfulLogins + failedLogins;
      const successRate = totalLogins > 0 ? (successfulLogins / totalLogins) * 100 : 0;

      // Get audit log counts
      const [totalAuditLogs, auditLogs24h] = await Promise.all([
        AuditLog.countDocuments({}),
        AuditLog.countDocuments({
          timestamp: { $gte: yesterday },
        }),
      ]);

      const uptime = Math.floor((Date.now() - this.startTime) / 1000);

      return {
        service: 'user-service',
        uptime,
        timestamp: now.toISOString(),
        users: {
          total: totalUsers,
          active: activeUsers,
        },
        authentication: {
          successfulLogins24h: successfulLogins,
          failedLogins24h: failedLogins,
          successRate: Math.round(successRate * 100) / 100,
        },
        auditLogs: {
          total: totalAuditLogs,
          last24h: auditLogs24h,
        },
      };
    } catch (error: any) {
      logger.error('Failed to collect metrics', error);
      throw error;
    }
  }

  /**
   * Get service uptime in seconds
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Format uptime as human-readable string
   */
  getFormattedUptime(): string {
    const uptime = this.getUptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
  }
}
