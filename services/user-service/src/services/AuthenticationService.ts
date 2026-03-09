/**
 * Authentication Service
 * Business logic for authentication operations
 * Implements Requirements 7.4, 10.1
 */

import { AuthService } from './AuthService';
import { PasswordService } from './PasswordService';
import { UserRepository } from '../repositories/UserRepository';
import { AuditLogger } from './AuditLogger';
import { logger } from '../utils/logger';
import { ValidationError, AuthenticationError } from '@finswitch/shared';
import { TokenResponse } from './AuthService';

export interface LoginDTO {
  username: string;
  password: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
  };
}

export interface TokenVerificationResult {
  valid: boolean;
  payload: {
    userId: string;
    username: string;
    roles: string[];
  };
  expiresAt: string;
}

export class AuthenticationService {
  private authService: AuthService;
  private passwordService: PasswordService;
  private userRepository: UserRepository;
  private auditLogger: AuditLogger;

  constructor() {
    this.authService = new AuthService();
    this.passwordService = new PasswordService();
    this.userRepository = new UserRepository();
    this.auditLogger = new AuditLogger();
  }

  /**
   * Authenticate user with username and password
   */
  async login(dto: LoginDTO): Promise<TokenResponse> {
    // Validate input
    if (!dto.username || !dto.password) {
      throw new ValidationError('Username and password are required');
    }

    // Find user
    const user = await this.userRepository.findByUsername(dto.username);
    
    if (!user) {
      // Log failed attempt
      logger.warn('Login attempt failed - user not found', {
        username: dto.username,
        correlationId: dto.metadata?.correlationId,
        timestamp: new Date().toISOString(),
      });

      // Audit log
      await this.auditLogger.logLoginFailed(
        dto.username,
        'User not found',
        dto.metadata
      );
      
      throw new AuthenticationError('Invalid username or password');
    }

    // Check if user is active
    if (!user.isActive) {
      logger.warn('Login attempt failed - user is inactive', {
        userId: user.userId,
        username: user.username,
        correlationId: dto.metadata?.correlationId,
      });

      await this.auditLogger.logLoginFailed(
        dto.username,
        'User account is inactive',
        dto.metadata
      );

      throw new AuthenticationError('User account is inactive');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.verifyPassword(
      dto.password,
      user.passwordHash
    );

    console.log(isPasswordValid);

    if (!isPasswordValid) {
      // Log failed attempt
      logger.warn('Login attempt failed - invalid password', {
        userId: user.userId,
        username: user.username,
        correlationId: dto.metadata?.correlationId,
        timestamp: new Date().toISOString(),
      });

      // Audit log
      await this.auditLogger.logLoginFailed(
        dto.username,
        'Invalid password',
        dto.metadata
      );
      
      throw new AuthenticationError('Invalid username or password');
    }

    // Generate JWT token
    const tokenResponse = this.authService.generateToken(user);

    // Update last login timestamp
    await this.userRepository.updateLastLogin(user.userId);

    // Log successful authentication
    logger.info('User authenticated successfully', {
      userId: user.userId,
      username: user.username,
      roles: user.roles,
      correlationId: dto.metadata?.correlationId,
      timestamp: new Date().toISOString(),
    });

    // Audit log
    await this.auditLogger.logLoginSuccess(
      user.userId,
      user.username,
      dto.metadata
    );

    return tokenResponse;
  }

  /**
   * Verify JWT token validity
   */
  verifyToken(token: string): TokenVerificationResult {
    const payload = this.authService.validateToken(token);

    return {
      valid: true,
      payload: {
        userId: payload.userId,
        username: payload.username,
        roles: payload.roles,
      },
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    };
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(currentToken: string): Promise<TokenResponse> {
    // Validate current token
    const payload = this.authService.validateToken(currentToken);

    // Find user
    const user = await this.userRepository.findById(payload.userId);
    
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Check if user is still active
    if (!user.isActive) {
      throw new AuthenticationError('User account is inactive');
    }

    // Generate new token
    const tokenResponse = this.authService.generateToken(user);

    logger.info('Token refreshed', {
      userId: user.userId,
      username: user.username,
    });

    return tokenResponse;
  }

  /**
   * Extract token from Authorization header
   */
  extractToken(authHeader: string | undefined): string {
    return this.authService.extractTokenFromHeader(authHeader);
  }
}
