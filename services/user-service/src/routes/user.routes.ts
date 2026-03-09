/**
 * User Management Routes
 * Defines user management endpoints with RBAC enforcement
 */

import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticationMiddleware, roleAuthorizationMiddleware } from '@finswitch/shared';
import { AuthService } from '../services/AuthService';
import { logger } from '../utils/logger';

const router = Router();
const userController = new UserController();
const authService = new AuthService();

// Create middleware instances
const authMiddleware = authenticationMiddleware(
  (token: string) => authService.validateToken(token),
  logger
);

const adminOnlyMiddleware = roleAuthorizationMiddleware(['Admin'], logger);

// All user routes require authentication
router.use(authMiddleware);

/**
 * POST /api/v1/users
 * Create a new user (Admin only)
 */
router.post('/', adminOnlyMiddleware, userController.createUser);

/**
 * GET /api/v1/users
 * List all users (Admin only)
 */
router.get('/', adminOnlyMiddleware, userController.listUsers);

/**
 * GET /api/v1/users/:id
 * Get user by ID (Admin or self)
 */
router.get('/:id', userController.getUserById);

/**
 * PUT /api/v1/users/:id
 * Update user (Admin only)
 */
router.put('/:id', adminOnlyMiddleware, userController.updateUser);

/**
 * DELETE /api/v1/users/:id
 * Deactivate user (Admin only)
 */
router.delete('/:id', adminOnlyMiddleware, userController.deleteUser);

export default router;
