import { Router } from 'express';
import { HealthController } from '../controllers/HealthController';

const router = Router();
const healthController = new HealthController();

// GET /health - Health check endpoint
router.get('/', healthController.health);

// GET /metrics - Metrics endpoint
router.get('/metrics', healthController.metrics);

export default router;
