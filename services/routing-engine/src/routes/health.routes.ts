/**
 * Health Routes
 * Defines health check and metrics endpoints
 */

import { Router } from 'express';
import { HealthController } from '../controllers/HealthController';

const router = Router();
const controller = new HealthController();

router.get('/health', controller.health);
router.get('/metrics', controller.metrics);

export default router;
