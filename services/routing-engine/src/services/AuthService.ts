/**
 * Auth Service
 * Handles JWT token validation for routing engine
 * Implements Requirements 7.5
 */

import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthenticationError, JWTPayload } from '@finswitch/shared';
import { logger } from '../utils/logger';

export class AuthService {
  /**
   * Validate JWT token
   */
  validateToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        algorithms: ['HS256'],
      }) as any;

      // Check if token has required fields
      if (!decoded.userId || !decoded.username || !decoded.roles || !decoded.iat || !decoded.exp) {
        throw new AuthenticationError('Invalid token payload');
      }

      return {
        userId: decoded.userId,
        username: decoded.username,
        roles: decoded.roles,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        logger.warn('Token expired', { error: error.message });
        throw new AuthenticationError('Token has expired');
      }

      if (error.name === 'JsonWebTokenError') {
        logger.warn('Invalid token', { error: error.message });
        throw new AuthenticationError('Invalid token');
      }

      logger.error('Token validation failed', error);
      throw new AuthenticationError('Token validation failed');
    }
  }
}
