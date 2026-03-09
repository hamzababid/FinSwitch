/**
 * Metrics Routes
 * Defines metrics endpoints
 */

import { Router } from 'express';
import { HealthController } from '../controllers/HealthController';

const router = Router();
const healthController = new HealthController();

/**
 * GET /metrics
 * Service metrics
 */
router.get('/', healthController.getMetrics);

export default router;
