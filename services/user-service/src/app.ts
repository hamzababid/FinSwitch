/**
 * Express Application Setup
 * Configures middleware, routes, and error handling
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import { correlationMiddleware, toErrorResponse } from '@finswitch/shared';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import healthRoutes from './routes/health.routes';
import metricsRoutes from './routes/metrics.routes';

export function createApp(): Application {
  const app = express();

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Correlation ID middleware
  app.use(correlationMiddleware());

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const correlationId = Array.isArray(req.headers['x-correlation-id'])
      ? req.headers['x-correlation-id'][0]
      : req.headers['x-correlation-id'];
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      correlationId,
    });
    next();
  });

  // Health check and metrics routes (no authentication required)
  app.use('/health', healthRoutes);
  app.use('/metrics', metricsRoutes);

  // API routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    });
  });

  // Global error handler
  app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    const correlationId = Array.isArray(req.headers['x-correlation-id'])
      ? req.headers['x-correlation-id'][0]
      : req.headers['x-correlation-id'];
    
    logger.error('Request error', error, {
      method: req.method,
      path: req.path,
      correlationId,
    });

    const { statusCode, body } = toErrorResponse(error, correlationId);
    res.status(statusCode).json(body);
  });

  return app;
}
