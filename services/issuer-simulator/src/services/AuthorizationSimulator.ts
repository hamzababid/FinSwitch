import { ISO8583AuthorizationResponse } from '../models/AuthorizationResponse';
import { ISO8583AuthorizationRequest } from '../models/AuthorizationRequest';
import { ScenarioManager, AuthorizationRequest } from './ScenarioManager';
import { logger } from '../utils/logger';
import { config } from '../config';

export class AuthorizationSimulator {
  private scenarioManager: ScenarioManager;

  constructor(scenarioManager?: ScenarioManager) {
    this.scenarioManager = scenarioManager || new ScenarioManager();
  }

  public async authorize(request: ISO8583AuthorizationRequest): Promise<ISO8583AuthorizationResponse> {
    const startTime = Date.now();

    // Convert ISO 8583 request to internal format for scenario matching
    const authRequest: AuthorizationRequest = {
      cardNumber: request.cardNumber,
      amount: request.amount,
      currency: request.currency,
      merchantId: request.merchantId,
      transactionType: this.parseTransactionType(request.processingCode),
    };

    // Find matching scenario
    const scenario = this.scenarioManager.findMatchingScenario(authRequest);

    if (!scenario) {
      logger.error('No matching scenario found, returning default decline', {
        cardNumber: this.maskCardNumber(request.cardNumber),
        amount: request.amount,
      });
      
      return this.buildResponse(request, '05', 'Do not honor', undefined);
    }

    // Apply processing delay if configured
    const delayMs = scenario.response.shouldDelay 
      ? scenario.response.delayMs || config.simulation.defaultProcessingDelayMs
      : this.getRandomDelay();

    await this.sleep(delayMs);

    // Generate authorization code for approved transactions
    const authCode = scenario.response.responseCode === '00' 
      ? this.generateAuthorizationCode()
      : undefined;

    const response = this.buildResponse(
      request,
      scenario.response.responseCode,
      scenario.response.responseMessage,
      authCode
    );

    const processingTime = Date.now() - startTime;

    logger.info('Authorization processed', {
      cardNumber: this.maskCardNumber(request.cardNumber),
      amount: request.amount,
      responseCode: response.responseCode,
      responseMessage: response.responseMessage,
      authorizationCode: authCode,
      processingTimeMs: processingTime,
      scenarioId: scenario.id,
    });

    return response;
  }

  private buildResponse(
    request: ISO8583AuthorizationRequest,
    responseCode: string,
    responseMessage: string,
    authorizationCode?: string
  ): ISO8583AuthorizationResponse {
    return {
      responseCode,
      responseMessage,
      authorizationCode,
      stan: request.stan,
      retrievalReferenceNumber: request.retrievalReferenceNumber,
      transmissionDateTime: new Date().toISOString(),
    };
  }

  public generateAuthorizationCode(): string {
    // Generate 6-character alphanumeric authorization code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters.charAt(randomIndex);
    }
    
    return code;
  }

  private parseTransactionType(processingCode: string): string {
    // Processing code format: TTFFAA
    // TT = Transaction type (00 = purchase, 01 = withdrawal, 20 = refund, etc.)
    // FF = From account (00 = default, 10 = savings, 20 = checking, etc.)
    // AA = To account
    
    if (processingCode.length < 2) {
      return 'UNKNOWN';
    }

    const transactionType = processingCode.substring(0, 2);
    
    const typeMap: Record<string, string> = {
      '00': 'PURCHASE',
      '01': 'WITHDRAWAL',
      '09': 'PURCHASE_WITH_CASHBACK',
      '20': 'REFUND',
      '21': 'DEPOSIT',
      '30': 'BALANCE_INQUIRY',
      '31': 'AVAILABLE_FUNDS_INQUIRY',
      '40': 'TRANSFER',
    };

    return typeMap[transactionType] || 'UNKNOWN';
  }

  private getRandomDelay(): number {
    // Add realistic processing delay between 50-100ms
    const minDelay = 50;
    const maxDelay = 100;
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private maskCardNumber(cardNumber: string): string {
    if (cardNumber.length < 10) {
      return '****';
    }
    const first6 = cardNumber.substring(0, 6);
    const last4 = cardNumber.substring(cardNumber.length - 4);
    return `${first6}****${last4}`;
  }

  public getScenarioManager(): ScenarioManager {
    return this.scenarioManager;
  }
}
