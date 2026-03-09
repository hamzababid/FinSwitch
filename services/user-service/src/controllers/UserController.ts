/**
 * User Controller
 * Handles HTTP requests for user management endpoints
 * Implements Requirements 7.1, 7.7
 */

import { Request, Response, NextFunction } from 'express';
import { UserManagementService } from '../services/UserManagementService';

export class UserController {
  private userManagementService: UserManagementService;

  constructor() {
    this.userManagementService = new UserManagementService();
  }

  /**
   * POST /api/v1/users
   * Create a new user (Admin only)
   */
  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, email, password, roles } = req.body;
      const createdBy = (req as any).user?.userId || 'system';
      const correlationId = req.headers['x-correlation-id'] as string;

      const user = await this.userManagementService.createUser({
        username,
        email,
        password,
        roles,
        createdBy,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          correlationId,
        },
      });

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/users
   * List all users with pagination (Admin only)
   */
  listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await this.userManagementService.listUsers(page, limit);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/users/:id
   * Get user by ID
   */
  getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const requestingUser = (req as any).user;
      const correlationId = req.headers['x-correlation-id'] as string;

      const user = await this.userManagementService.getUserById(
        id,
        requestingUser.userId,
        requestingUser.roles,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          correlationId,
        }
      );

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/users/:id
   * Update user (Admin only)
   */
  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { email, roles, isActive } = req.body;
      const lastModifiedBy = (req as any).user?.userId || 'system';
      const correlationId = req.headers['x-correlation-id'] as string;

      const user = await this.userManagementService.updateUser(id, {
        email,
        roles,
        isActive,
        lastModifiedBy,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          correlationId,
        },
      });

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/users/:id
   * Deactivate user (soft delete) (Admin only)
   */
  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const deactivatedBy = (req as any).user?.userId || 'system';
      const correlationId = req.headers['x-correlation-id'] as string;

      await this.userManagementService.deactivateUser(id, deactivatedBy, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId,
      });

      res.status(200).json({
        success: true,
        message: 'User deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
