/**
 * Correlation ID middleware for request tracking
 * Implements Requirement 13.7 - correlation across services
 */

import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Generate or extract correlation ID from request
 */
export function getOrCreateCorrelationId(headers: Record<string, string | string[] | undefined>): string {
  const existing = headers[CORRELATION_ID_HEADER] || headers[CORRELATION_ID_HEADER.toLowerCase()];
  
  if (typeof existing === 'string') {
    return existing;
  }
  
  if (Array.isArray(existing) && existing.length > 0) {
    return existing[0];
  }
  
  return uuidv4();
}

/**
 * Create headers with correlation ID for downstream requests
 */
export function createHeadersWithCorrelation(
  correlationId: string,
  additionalHeaders?: Record<string, string>
): Record<string, string> {
  return {
    [CORRELATION_ID_HEADER]: correlationId,
    ...additionalHeaders
  };
}
