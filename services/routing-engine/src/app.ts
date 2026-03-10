/**
 * Express Application Setup
 * Configures middleware, routes, and error handling
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import { correlationMiddleware, toErrorResponse } from '@finswitch/shared';
import { logger } from './utils/logger';

export function createApp(): Application {
  const app = express();

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Correlation ID middleware
  app.use(correlationMiddleware());

  // Request logging middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
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

  // API routes
  const routingRoutes = require('./routes/routing.routes').default;
  const healthRoutes = require('./routes/health.routes').default;
  
  app.use('/api/v1/routing', routingRoutes);
  app.use('/', healthRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    });
  });

  // Global error handler
  app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
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
