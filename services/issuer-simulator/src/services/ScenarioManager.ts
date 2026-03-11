import { SimulationScenario, DEFAULT_SCENARIOS, ScenarioTrigger } from '../models/SimulationScenario';
import { logger } from '../utils/logger';

export interface AuthorizationRequest {
  cardNumber: string;
  amount: number;
  currency: string;
  merchantId: string;
  transactionType: string;
}

export class ScenarioManager {
  private scenarios: SimulationScenario[];

  constructor(customScenarios?: SimulationScenario[]) {
    this.scenarios = customScenarios || DEFAULT_SCENARIOS;
    this.sortScenariosByPriority();
    logger.info('ScenarioManager initialized', { scenarioCount: this.scenarios.length });
  }

  private sortScenariosByPriority(): void {
    this.scenarios.sort((a, b) => b.priority - a.priority);
  }

  public addScenario(scenario: SimulationScenario): void {
    this.scenarios.push(scenario);
    this.sortScenariosByPriority();
    logger.info('Scenario added', { scenarioId: scenario.id, priority: scenario.priority });
  }

  public removeScenario(scenarioId: string): boolean {
    const initialLength = this.scenarios.length;
    this.scenarios = this.scenarios.filter(s => s.id !== scenarioId);
    const removed = this.scenarios.length < initialLength;
    
    if (removed) {
      logger.info('Scenario removed', { scenarioId });
    }
    
    return removed;
  }

  public getScenarios(): SimulationScenario[] {
    return [...this.scenarios];
  }

  public findMatchingScenario(request: AuthorizationRequest): SimulationScenario | null {
    for (const scenario of this.scenarios) {
      if (!scenario.enabled) {
        continue;
      }

      if (this.matchesTrigger(scenario.trigger, request)) {
        logger.debug('Matching scenario found', {
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          cardNumber: this.maskCardNumber(request.cardNumber),
          amount: request.amount,
        });
        return scenario;
      }
    }

    logger.warn('No matching scenario found', {
      cardNumber: this.maskCardNumber(request.cardNumber),
      amount: request.amount,
    });
    return null;
  }

  private matchesTrigger(trigger: ScenarioTrigger, request: AuthorizationRequest): boolean {
    switch (trigger.type) {
      case 'card_pattern':
        return this.matchesCardPattern(trigger.pattern, request.cardNumber);
      
      case 'amount_range':
        return this.matchesAmountRange(trigger.minAmount, trigger.maxAmount, request.amount);
      
      case 'combined':
        const cardMatch = trigger.cardPattern 
          ? this.matchesCardPattern(trigger.cardPattern, request.cardNumber)
          : true;
        const amountMatch = this.matchesAmountRange(trigger.minAmount, trigger.maxAmount, request.amount);
        return cardMatch && amountMatch;
      
      default:
        return false;
    }
  }

  private matchesCardPattern(pattern: string, cardNumber: string): boolean {
    try {
      const regex = new RegExp(pattern);
      return regex.test(cardNumber);
    } catch (error) {
      logger.error('Invalid card pattern regex', { pattern, error });
      return false;
    }
  }

  private matchesAmountRange(minAmount: number | undefined, maxAmount: number | undefined, amount: number): boolean {
    if (minAmount !== undefined && amount < minAmount) {
      return false;
    }
    if (maxAmount !== undefined && amount > maxAmount) {
      return false;
    }
    return true;
  }

  private maskCardNumber(cardNumber: string): string {
    if (cardNumber.length < 10) {
      return '****';
    }
    const first6 = cardNumber.substring(0, 6);
    const last4 = cardNumber.substring(cardNumber.length - 4);
    return `${first6}****${last4}`;
  }
}
