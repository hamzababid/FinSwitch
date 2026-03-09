/**
 * Health Check Routes
 * Defines health check and metrics endpoints
 */

import { Router } from 'express';
import { HealthController } from '../controllers/HealthController';

const router = Router();
const healthController = new HealthController();

/**
 * GET /health
 * Basic health check
 */
router.get('/', healthController.healthCheck);

/**
 * GET /health/ready
 * Readiness probe
 */
router.get('/ready', healthController.readinessCheck);

/**
 * GET /health/live
 * Liveness probe
 */
router.get('/live', healthController.livenessCheck);

export default router;
