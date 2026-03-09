/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 * Implements Requirements 7.4, 10.1
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticationService } from '../services/AuthenticationService';

export class AuthController {
  private authenticationService: AuthenticationService;

  constructor() {
    this.authenticationService = new AuthenticationService();
  }

  /**
   * POST /api/v1/auth/login
   * Authenticate user and return JWT token
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, password } = req.body;
      const correlationId = req.headers['x-correlation-id'] as string;

      const tokenResponse = await this.authenticationService.login({
        username,
        password,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          correlationId,
        },
      });

      res.status(200).json({
        success: true,
        data: tokenResponse,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/auth/verify
   * Verify JWT token validity
   */
  verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = this.authenticationService.extractToken(authHeader);
      const result = this.authenticationService.verifyToken(token);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/auth/refresh
   * Refresh JWT token
   */
  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = this.authenticationService.extractToken(authHeader);
      const tokenResponse = await this.authenticationService.refreshToken(token);

      res.status(200).json({
        success: true,
        data: tokenResponse,
      });
    } catch (error) {
      next(error);
    }
  };
}
