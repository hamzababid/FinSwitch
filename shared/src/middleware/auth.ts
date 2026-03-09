/**
 * JWT Authentication middleware
 * Implements Requirements 1.6, 7.5
 */

import { AuthenticationError } from '../errors';

export interface JWTPayload {
  userId: string;
  username: string;
  roles: string[];
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest {
  user?: JWTPayload;
  correlationId?: string;
}

/**
 * Verify JWT token
 * This is a placeholder - actual implementation will use jsonwebtoken library
 */
export function verifyToken(token: string, secret: string): JWTPayload {
  // This will be implemented in each service using jsonwebtoken
  // Placeholder for type safety
  throw new Error('verifyToken must be implemented in service');
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | undefined): string {
  if (!authHeader) {
    throw new AuthenticationError('Authorization header is required');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new AuthenticationError('Invalid authorization header format. Expected: Bearer <token>');
  }

  return parts[1];
}

/**
 * Check if token is expired
 */
export function isTokenExpired(payload: JWTPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}
