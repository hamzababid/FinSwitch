import { Router } from 'express';
import { IssuerController } from '../controllers/IssuerController';

const router = Router();
const issuerController = new IssuerController();

// POST /api/v1/issuer/authorize - Process authorization request
router.post('/authorize', issuerController.authorize);

// GET /api/v1/issuer/scenarios - Get configured scenarios
router.get('/scenarios', issuerController.getScenarios);

export default router;
