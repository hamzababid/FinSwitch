/**
 * Express-specific middleware implementations
 * These are ready-to-use middleware functions for Express/NestJS services
 */

import { Request, Response, NextFunction } from 'express';
import { getOrCreateCorrelationId } from './correlation';
import { extractToken, JWTPayload, AuthenticatedRequest } from './auth';
import { requirePermission, requireAnyRole, Resource, Action } from './rbac';
import { toErrorResponse } from '../errors';
import { Logger } from '../logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request extends AuthenticatedRequest {}
  }
}

/**
 * Correlation ID middleware
 * Generates or extracts correlation ID and adds it to request
 */
export function correlationMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = getOrCreateCorrelationId(req.headers as Record<string, string | string[] | undefined>);
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  };
}

/**
 * Authentication middleware factory
 * Validates JWT token and attaches user to request
 */
export function authenticationMiddleware(
  verifyTokenFn: (token: string) => JWTPayload,
  logger: Logger
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = extractToken(req.headers.authorization);
      const payload = verifyTokenFn(token);
      req.user = payload;
      
      logger.debug('User authenticated', {
        correlationId: req.correlationId,
        userId: payload.userId,
        username: payload.username,
        roles: payload.roles
      });
      
      next();
    } catch (error: any) {
      logger.warn('Authentication failed', {
        correlationId: req.correlationId,
        error: error.message
      });
      
      const { statusCode, body } = toErrorResponse(error, req.correlationId);
      res.status(statusCode).json(body);
    }
  };
}

/**
 * Authorization middleware factory - permission-based
 * Checks if user has required permission for resource and action
 */
export function authorizationMiddleware(
  resource: Resource,
  action: Action,
  logger: Logger
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      requirePermission(req.user, resource, action);
      
      logger.debug('Authorization successful', {
        correlationId: req.correlationId,
        userId: req.user?.userId,
        resource,
        action
      });
      
      next();
    } catch (error: any) {
      logger.warn('Authorization failed', {
        correlationId: req.correlationId,
        userId: req.user?.userId,
        resource,
        action,
        error: error.message
      });
      
      const { statusCode, body } = toErrorResponse(error, req.correlationId);
      res.status(statusCode).json(body);
    }
  };
}

/**
 * Authorization middleware factory - role-based
 * Checks if user has at least one of the required roles
 */
export function roleAuthorizationMiddleware(
  requiredRoles: string[],
  logger: Logger
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      requireAnyRole(req.user, requiredRoles);
      
      logger.debug('Role authorization successful', {
        correlationId: req.correlationId,
        userId: req.user?.userId,
        requiredRoles,
        userRoles: req.user?.roles
      });
      
      next();
    } catch (error: any) {
      logger.warn('Role authorization failed', {
        correlationId: req.correlationId,
        userId: req.user?.userId,
        requiredRoles,
        userRoles: req.user?.roles,
        error: error.message
      });
      
      const { statusCode, body } = toErrorResponse(error, req.correlationId);
      res.status(statusCode).json(body);
    }
  };
}

/**
 * Error handling middleware
 * Catches all errors and returns standardized error response
 */
export function errorHandlerMiddleware(logger: Logger) {
  return (error: Error, req: Request, res: Response, next: NextFunction): void => {
    logger.error('Request failed', error, {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      userId: req.user?.userId
    });

    const { statusCode, body } = toErrorResponse(error, req.correlationId);
    res.status(statusCode).json(body);
  };
}

/**
 * Request logging middleware
 * Logs incoming requests with timing
 */
export function requestLoggingMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    // Log request
    logger.info('Incoming request', {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      userId: req.user?.userId
    });

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info('Request completed', {
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userId: req.user?.userId
      });
    });

    next();
  };
}
