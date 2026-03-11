import { Request, Response } from 'express';
import { metricsService } from '../services/MetricsService';
import { logger } from '../utils/logger';
import { config } from '../config';

export class HealthController {
  public health = async (_req: Request, res: Response): Promise<void> => {
    try {
      const health = {
        status: 'healthy',
        service: 'issuer-simulator',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: config.nodeEnv,
      };

      res.status(200).json(health);
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(503).json({
        status: 'unhealthy',
        service: 'issuer-simulator',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  public metrics = async (_req: Request, res: Response): Promise<void> => {
    try {
      const metrics = metricsService.getMetrics();

      res.status(200).json({
        service: 'issuer-simulator',
        timestamp: new Date().toISOString(),
        metrics: {
          authorization: {
            total: metrics.totalRequests,
            approved: metrics.approvedRequests,
            declined: metrics.declinedRequests,
            errors: metrics.errorRequests,
            approvalRate: `${metrics.approvalRate}%`,
            declineRate: `${metrics.declineRate}%`,
            errorRate: `${metrics.errorRate}%`,
            averageProcessingTimeMs: metrics.averageProcessingTimeMs,
          },
          system: {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
          },
          lastResetTime: metrics.lastResetTime,
        },
      });
    } catch (error) {
      logger.error('Metrics retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve metrics',
        timestamp: new Date().toISOString(),
      });
    }
  };
}
