import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { correlationMiddleware } from '@finswitch/shared';
import issuerRoutes from './routes/issuer.routes';
import healthRoutes from './routes/health.routes';
import { logger } from './utils/logger';
import { config } from './config';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
  });
  app.use(limiter);

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Correlation ID middleware
  app.use(correlationMiddleware());

  // Request logging middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      correlationId: req.headers['x-correlation-id'],
    });
    next();
  });

  // Routes
  app.use('/health', healthRoutes);
  app.use('/api/v1/issuer', issuerRoutes);

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'issuer-simulator',
      version: '1.0.0',
      status: 'running',
      environment: config.nodeEnv,
    });
  });

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'The requested resource was not found',
      timestamp: new Date().toISOString(),
    });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
