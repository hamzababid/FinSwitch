/**
 * Routing Routes
 * Defines routing endpoints and middleware
 */

import { Router } from 'express';
import { RoutingController } from '../controllers/RoutingController';
import { authenticationMiddleware, roleAuthorizationMiddleware } from '@finswitch/shared';
import { AuthService } from '../services/AuthService';
import { logger } from '../utils/logger';

const router = Router();
const controller = new RoutingController();
const authService = new AuthService();

// Create middleware instances
const authMiddleware = authenticationMiddleware(
  (token: string) => authService.validateToken(token),
  logger
);

const adminOpsMiddleware = roleAuthorizationMiddleware(['Admin', 'Operations'], logger);

// Public endpoint - evaluate routing (called by payment service)
router.post('/evaluate', controller.evaluateRouting);

// Protected endpoints - routing rule management
router.get('/rules', authMiddleware, controller.listRules);
router.post('/rules', authMiddleware, adminOpsMiddleware, controller.createRule);
router.get('/rules/:id', authMiddleware, controller.getRuleById);
router.put('/rules/:id', authMiddleware, adminOpsMiddleware, controller.updateRule);
router.delete('/rules/:id', authMiddleware, adminOpsMiddleware, controller.deleteRule);

// Cache stats endpoint
router.get('/cache/stats', authMiddleware, adminOpsMiddleware, controller.getCacheStats);

export default router;
