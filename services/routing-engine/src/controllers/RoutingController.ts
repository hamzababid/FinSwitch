/**
 * Routing Controller
 * Handles HTTP requests for routing endpoints
 * Implements Requirements 2.1, 2.2
 */

import { Request, Response, NextFunction } from 'express';
import { RoutingService } from '../services/RoutingService';
import { TransactionContext } from '../services/RuleEvaluator';

export class RoutingController {
  private routingService: RoutingService;

  constructor() {
    this.routingService = new RoutingService();
  }

  /**
   * POST /api/v1/routing/evaluate
   * Evaluate routing for a transaction
   */
  evaluateRouting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const transaction: TransactionContext = req.body;
      const decision = await this.routingService.evaluateRouting(transaction);

      res.status(200).json({
        success: true,
        data: decision,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/routing/rules
   * List all routing rules with pagination
   */
  listRules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await this.routingService.listRules(page, limit);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/routing/rules
   * Create new routing rule (Admin/Operations only)
   */
  createRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const createdBy = (req as any).user?.userId || 'system';
      const ruleData = {
        ...req.body,
        createdBy,
      };

      const metadata = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId: req.headers['x-correlation-id'] as string,
      };

      const rule = await this.routingService.createRule(ruleData, metadata);

      res.status(201).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/routing/rules/:id
   * Get routing rule by ID
   */
  getRuleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const rule = await this.routingService.getRuleById(id);

      res.status(200).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/routing/rules/:id
   * Update routing rule (Admin/Operations only)
   */
  updateRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const lastModifiedBy = (req as any).user?.userId || 'system';
      const updateData = {
        ...req.body,
        lastModifiedBy,
      };

      const metadata = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId: req.headers['x-correlation-id'] as string,
      };

      const rule = await this.routingService.updateRule(id, updateData, metadata);

      res.status(200).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/routing/rules/:id
   * Delete routing rule (Admin/Operations only)
   */
  deleteRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const deletedBy = (req as any).user?.userId || 'system';

      const metadata = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId: req.headers['x-correlation-id'] as string,
      };

      await this.routingService.deleteRule(id, deletedBy, metadata);

      res.status(200).json({
        success: true,
        message: 'Routing rule deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/routing/cache/stats
   * Get cache statistics
   */
  getCacheStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.routingService.getCacheStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}
