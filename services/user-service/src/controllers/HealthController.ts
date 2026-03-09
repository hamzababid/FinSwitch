/**
 * Health Check Controller
 * Handles health check and metrics endpoints
 * Implements Requirement 13.3
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { MetricsService } from '../services/MetricsService';
import { logger } from '../utils/logger';

export class HealthController {
  private metricsService: MetricsService;

  constructor() {
    this.metricsService = new MetricsService();
  }

  /**
   * GET /health
   * Basic health check endpoint
   */
  healthCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check MongoDB connection
      const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
      const isHealthy = dbStatus === 'connected';

      const response = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        service: 'user-service',
        timestamp: new Date().toISOString(),
        uptime: this.metricsService.getFormattedUptime(),
        database: {
          status: dbStatus,
          type: 'mongodb',
        },
      };

      const statusCode = isHealthy ? 200 : 503;
      res.status(statusCode).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /health/ready
   * Readiness probe - checks if service is ready to accept traffic
   */
  readinessCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if MongoDB is connected
      const isReady = mongoose.connection.readyState === 1;

      if (isReady) {
        res.status(200).json({
          status: 'ready',
          service: 'user-service',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          status: 'not ready',
          service: 'user-service',
          timestamp: new Date().toISOString(),
          reason: 'Database not connected',
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /health/live
   * Liveness probe - checks if service is alive
   */
  livenessCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        status: 'alive',
        service: 'user-service',
        timestamp: new Date().toISOString(),
        uptime: this.metricsService.getUptime(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /metrics
   * Service metrics endpoint
   */
  getMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = await this.metricsService.getMetrics();

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('Failed to retrieve metrics', error as Error);
      next(error);
    }
  };
}
