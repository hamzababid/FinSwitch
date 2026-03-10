/**
 * Rule Evaluator Service
 * Evaluates routing rules based on transaction attributes
 * Implements Requirements 2.2, 2.3, 2.4, 2.5
 */

import { IRoutingRule } from '../models/RoutingRule';
import { logger } from '../utils/logger';

export interface TransactionContext {
  cardNumber: string;
  amount: number;
  merchantId: string;
  currency: string;
  transactionType: string;
}

export interface RoutingDecision {
  matched: boolean;
  rule?: {
    ruleId: string;
    name: string;
    priority: number;
  };
  route?: {
    issuerEndpoint: string;
    processorId: string;
    timeout: number;
    retryAttempts: number;
  };
  fallback?: boolean;
  reason?: string;
}

export class RuleEvaluator {
  private readonly DEFAULT_ISSUER_ENDPOINT = 'http://issuer-simulator:3003/authorize';
  private readonly DEFAULT_PROCESSOR_ID = 'default-processor';
  private readonly DEFAULT_TIMEOUT = 30000;
  private readonly DEFAULT_RETRY_ATTEMPTS = 3;

  /**
   * Evaluate transaction against routing rules
   * Returns the highest priority matching rule or default fallback
   */
  evaluate(transaction: TransactionContext, rules: IRoutingRule[]): RoutingDecision {
    try {
      logger.debug('Evaluating routing rules', {
        cardBin: this.extractCardBin(transaction.cardNumber),
        amount: transaction.amount,
        merchantId: transaction.merchantId,
        currency: transaction.currency,
        transactionType: transaction.transactionType,
        totalRules: rules.length,
      });

      // Find all matching rules
      const matchingRules = rules.filter(rule => this.matchesRule(transaction, rule));

      if (matchingRules.length === 0) {
        logger.info('No matching rules found, using default fallback');
        return this.getDefaultFallback();
      }

      // Select highest priority rule (rules are already sorted by priority desc)
      const selectedRule = matchingRules[0];

      logger.info('Routing rule matched', {
        ruleId: selectedRule.ruleId,
        ruleName: selectedRule.name,
        priority: selectedRule.priority,
        totalMatches: matchingRules.length,
      });

      return {
        matched: true,
        rule: {
          ruleId: selectedRule.ruleId,
          name: selectedRule.name,
          priority: selectedRule.priority,
        },
        route: {
          issuerEndpoint: selectedRule.route.issuerEndpoint,
          processorId: selectedRule.route.processorId,
          timeout: selectedRule.route.timeout || this.DEFAULT_TIMEOUT,
          retryAttempts: selectedRule.route.retryAttempts ?? this.DEFAULT_RETRY_ATTEMPTS,
        },
        fallback: false,
      };
    } catch (error: any) {
      logger.error('Failed to evaluate routing rules', error);
      // Return default fallback on error
      return this.getDefaultFallback();
    }
  }

  /**
   * Check if transaction matches a specific rule
   */
  private matchesRule(transaction: TransactionContext, rule: IRoutingRule): boolean {
    const conditions = rule.conditions;

    // Check card BIN ranges
    if (conditions.cardBinRanges && conditions.cardBinRanges.length > 0) {
      if (!this.matchesCardBin(transaction.cardNumber, conditions.cardBinRanges)) {
        return false;
      }
    }

    // Check amount range
    if (conditions.amountRange) {
      if (!this.matchesAmountRange(transaction.amount, conditions.amountRange)) {
        return false;
      }
    }

    // Check merchant IDs
    if (conditions.merchantIds && conditions.merchantIds.length > 0) {
      if (!conditions.merchantIds.includes(transaction.merchantId)) {
        return false;
      }
    }

    // Check currencies
    if (conditions.currencies && conditions.currencies.length > 0) {
      if (!conditions.currencies.includes(transaction.currency)) {
        return false;
      }
    }

    // Check transaction types
    if (conditions.transactionTypes && conditions.transactionTypes.length > 0) {
      if (!conditions.transactionTypes.includes(transaction.transactionType)) {
        return false;
      }
    }

    // All conditions matched
    return true;
  }

  /**
   * Check if card number matches any of the BIN ranges
   */
  private matchesCardBin(cardNumber: string, binRanges: string[]): boolean {
    const cardBin = this.extractCardBin(cardNumber);

    for (const range of binRanges) {
      if (this.isInBinRange(cardBin, range)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract first 6 digits (BIN) from card number
   */
  private extractCardBin(cardNumber: string): string {
    return cardNumber.substring(0, 6);
  }

  /**
   * Check if BIN is within a range (e.g., "400000-499999")
   */
  private isInBinRange(bin: string, range: string): boolean {
    const [start, end] = range.split('-').map(s => s.trim());
    
    if (!start || !end) {
      logger.warn('Invalid BIN range format', { range });
      return false;
    }

    const binNum = parseInt(bin, 10);
    const startNum = parseInt(start, 10);
    const endNum = parseInt(end, 10);

    return binNum >= startNum && binNum <= endNum;
  }

  /**
   * Check if amount is within range
   */
  private matchesAmountRange(
    amount: number,
    range: { min?: number; max?: number }
  ): boolean {
    if (range.min !== undefined && amount < range.min) {
      return false;
    }

    if (range.max !== undefined && amount > range.max) {
      return false;
    }

    return true;
  }

  /**
   * Get default fallback routing decision
   */
  private getDefaultFallback(): RoutingDecision {
    return {
      matched: false,
      route: {
        issuerEndpoint: this.DEFAULT_ISSUER_ENDPOINT,
        processorId: this.DEFAULT_PROCESSOR_ID,
        timeout: this.DEFAULT_TIMEOUT,
        retryAttempts: this.DEFAULT_RETRY_ATTEMPTS,
      },
      fallback: true,
      reason: 'No matching rules found, using default routing',
    };
  }

  /**
   * Validate transaction context
   */
  validateTransaction(transaction: TransactionContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!transaction.cardNumber || transaction.cardNumber.length < 13) {
      errors.push('Invalid card number');
    }

    if (transaction.amount === undefined || transaction.amount < 0) {
      errors.push('Invalid amount');
    }

    if (!transaction.merchantId) {
      errors.push('Merchant ID is required');
    }

    if (!transaction.currency || transaction.currency.length !== 3) {
      errors.push('Invalid currency code');
    }

    if (!transaction.transactionType) {
      errors.push('Transaction type is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
