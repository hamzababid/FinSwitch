/**
 * Authentication Routes
 * Defines authentication endpoints
 */

import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const router = Router();
const authController = new AuthController();

/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', authController.login);

/**
 * POST /api/v1/auth/verify
 * Verify JWT token validity
 */
router.post('/verify', authController.verifyToken);

/**
 * POST /api/v1/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', authController.refreshToken);

export default router;
