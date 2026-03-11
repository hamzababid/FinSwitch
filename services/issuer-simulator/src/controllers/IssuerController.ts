import { Request, Response } from 'express';
import { ISO8583Validator } from '../services/ISO8583Validator';
import { AuthorizationSimulator } from '../services/AuthorizationSimulator';
import { ISO8583AuthorizationRequest } from '../models/AuthorizationRequest';
import { logger } from '../utils/logger';

export class IssuerController {
  private authorizationSimulator: AuthorizationSimulator;

  constructor(authorizationSimulator?: AuthorizationSimulator) {
    this.authorizationSimulator = authorizationSimulator || new AuthorizationSimulator();
  }

  public authorize = async (req: Request, res: Response): Promise<void> => {
    const correlationId = req.headers['x-correlation-id'] as string || 'unknown';
    
    try {
      const authRequest: Partial<ISO8583AuthorizationRequest> = req.body;

      logger.info('Authorization request received', {
        correlationId,
        cardNumber: this.maskCardNumber(authRequest.cardNumber || ''),
        amount: authRequest.amount,
        merchantId: authRequest.merchantId,
      });

      // Validate ISO 8583 message format
      const validationResult = ISO8583Validator.validate(authRequest);

      if (!validationResult.isValid) {
        logger.warn('Authorization request validation failed', {
          correlationId,
          errors: validationResult.errors,
        });

        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid ISO 8583 message format',
          errors: validationResult.errors,
          responseCode: '30', // Format error
          timestamp: new Date().toISOString(),
          correlationId,
        });
        return;
      }

      // Process authorization
      const authResponse = await this.authorizationSimulator.authorize(
        authRequest as ISO8583AuthorizationRequest
      );

      // Return response with appropriate HTTP status
      const httpStatus = authResponse.responseCode === '00' ? 200 : 200; // Always 200 for valid requests
      
      res.status(httpStatus).json({
        ...authResponse,
        correlationId,
      });

    } catch (error) {
      logger.error('Authorization processing error', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Internal server error during authorization',
        responseCode: '96', // System malfunction
        timestamp: new Date().toISOString(),
        correlationId,
      });
    }
  };

  public getScenarios = async (_req: Request, res: Response): Promise<void> => {
    try {
      const scenarios = this.authorizationSimulator.getScenarioManager().getScenarios();
      
      res.status(200).json({
        scenarios: scenarios.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          priority: s.priority,
          enabled: s.enabled,
          trigger: s.trigger,
          response: {
            responseCode: s.response.responseCode,
            responseMessage: s.response.responseMessage,
          },
        })),
        count: scenarios.length,
      });
    } catch (error) {
      logger.error('Error fetching scenarios', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch scenarios',
        timestamp: new Date().toISOString(),
      });
    }
  };

  private maskCardNumber(cardNumber: string): string {
    if (cardNumber.length < 10) {
      return '****';
    }
    const first6 = cardNumber.substring(0, 6);
    const last4 = cardNumber.substring(cardNumber.length - 4);
    return `${first6}****${last4}`;
  }
}
