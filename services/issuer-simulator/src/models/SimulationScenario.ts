export interface CardPatternTrigger {
  type: 'card_pattern';
  pattern: string; // Regex pattern for card number
}

export interface AmountRangeTrigger {
  type: 'amount_range';
  minAmount?: number;
  maxAmount?: number;
}

export interface CombinedTrigger {
  type: 'combined';
  cardPattern?: string;
  minAmount?: number;
  maxAmount?: number;
}

export type ScenarioTrigger = CardPatternTrigger | AmountRangeTrigger | CombinedTrigger;

export interface ScenarioResponse {
  responseCode: string; // ISO 8583 response codes: '00' = approved, '05' = declined, '91' = timeout
  responseMessage: string;
  shouldDelay?: boolean;
  delayMs?: number;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  trigger: ScenarioTrigger;
  response: ScenarioResponse;
  priority: number; // Higher priority scenarios are checked first
  enabled: boolean;
}

// Default scenarios for common test cases
export const DEFAULT_SCENARIOS: SimulationScenario[] = [
  {
    id: 'decline-insufficient-funds',
    name: 'Decline - Insufficient Funds',
    description: 'Cards ending in 0001 are declined due to insufficient funds',
    trigger: {
      type: 'card_pattern',
      pattern: '.*0001$',
    },
    response: {
      responseCode: '51',
      responseMessage: 'Insufficient funds',
    },
    priority: 100,
    enabled: true,
  },
  {
    id: 'decline-invalid-card',
    name: 'Decline - Invalid Card',
    description: 'Cards ending in 0002 are declined as invalid',
    trigger: {
      type: 'card_pattern',
      pattern: '.*0002$',
    },
    response: {
      responseCode: '14',
      responseMessage: 'Invalid card number',
    },
    priority: 100,
    enabled: true,
  },
  {
    id: 'timeout-simulation',
    name: 'Timeout Simulation',
    description: 'Cards ending in 0003 simulate timeout',
    trigger: {
      type: 'card_pattern',
      pattern: '.*0003$',
    },
    response: {
      responseCode: '91',
      responseMessage: 'Issuer or switch inoperative',
      shouldDelay: true,
      delayMs: 5000,
    },
    priority: 100,
    enabled: true,
  },
  {
    id: 'high-amount-decline',
    name: 'High Amount Decline',
    description: 'Transactions over 10000 are declined',
    trigger: {
      type: 'amount_range',
      minAmount: 10000,
    },
    response: {
      responseCode: '61',
      responseMessage: 'Exceeds withdrawal amount limit',
    },
    priority: 90,
    enabled: true,
  },
  {
    id: 'default-approval',
    name: 'Default Approval',
    description: 'All other transactions are approved',
    trigger: {
      type: 'combined',
    },
    response: {
      responseCode: '00',
      responseMessage: 'Approved',
    },
    priority: 1,
    enabled: true,
  },
];
