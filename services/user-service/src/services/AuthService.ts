/**
 * Authentication Service
 * Handles JWT token generation and validation
 * Implements Requirement 7.4
 */

import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { IUser } from '../models/User';

export interface JWTPayload {
  userId: string;
  username: string;
  roles: string[];
  iat: number;
  exp: number;
}

export interface TokenResponse {
  token: string;
  expiresIn: number;
  user: {
    userId: string;
    username: string;
    email: string;
    roles: string[];
  };
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;

  constructor() {
    this.jwtSecret = config.jwt.secret;
    this.jwtExpiresIn = config.jwt.expiresIn;

    if (!this.jwtSecret || this.jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }
  }

  /**
   * Generate JWT token for authenticated user
   * @param user - User document
   * @returns Token response with JWT and user info
   */
  generateToken(user: IUser): TokenResponse {
    try {
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: user.userId,
        username: user.username,
        roles: user.roles,
      };

      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn,
        algorithm: 'HS256',
      } as jwt.SignOptions);

      // Calculate expiration time in seconds
      const decoded = jwt.decode(token) as JWTPayload;
      const expiresIn = decoded.exp - decoded.iat;

      logger.info('JWT token generated', {
        userId: user.userId,
        username: user.username,
        expiresIn,
      });

      return {
        token,
        expiresIn,
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          roles: user.roles,
        },
      };
    } catch (error: any) {
      logger.error('Failed to generate JWT token', error, {
        userId: user.userId,
      });
      throw error;
    }
  }

  /**
   * Validate and decode JWT token
   * @param token - JWT token string
   * @returns Decoded JWT payload
   * @throws Error if token is invalid or expired
   */
  validateToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
      }) as JWTPayload;

      logger.debug('JWT token validated', {
        userId: payload.userId,
        username: payload.username,
      });

      return payload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        logger.warn('JWT token expired', { expiredAt: error.expiredAt });
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        logger.warn('Invalid JWT token', { error: error.message });
        throw new Error('Invalid token');
      } else {
        logger.error('JWT token validation failed', error);
        throw error;
      }
    }
  }

  /**
   * Decode JWT token without verification (for debugging)
   * @param token - JWT token string
   * @returns Decoded payload or null if invalid
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   * @param token - JWT token string
   * @returns True if expired, false otherwise
   */
  isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeToken(token);
      if (!payload) {
        return true;
      }

      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration time
   * @param token - JWT token string
   * @returns Expiration timestamp or null
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const payload = this.decodeToken(token);
      if (!payload) {
        return null;
      }

      return new Date(payload.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get time until token expires
   * @param token - JWT token string
   * @returns Seconds until expiration or 0 if expired
   */
  getTimeUntilExpiration(token: string): number {
    try {
      const payload = this.decodeToken(token);
      if (!payload) {
        return 0;
      }

      const now = Math.floor(Date.now() / 1000);
      const timeLeft = payload.exp - now;
      return Math.max(0, timeLeft);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Extract token from Authorization header
   * @param authHeader - Authorization header value
   * @returns Token string
   * @throws Error if header format is invalid
   */
  extractTokenFromHeader(authHeader: string | undefined): string {
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new Error('Invalid authorization header format. Expected: Bearer <token>');
    }

    return parts[1];
  }
}
