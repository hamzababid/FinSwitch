/**
 * Error classification for standardized error handling
 * Implements Requirements 1.3, error handling patterns
 */

export enum ErrorCategory {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_FAILED',
  AUTHORIZATION = 'AUTHORIZATION_FAILED',
  NOT_FOUND = 'RESOURCE_NOT_FOUND',
  PROCESSING = 'PROCESSING_ERROR',
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER_OPEN',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  DATABASE = 'DATABASE_ERROR',
  INTERNAL = 'INTERNAL_SERVER_ERROR'
}

/**
 * Base error class for all custom errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCategory;
  public readonly field?: string;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    errorCode: ErrorCategory,
    statusCode: number,
    field?: string,
    details?: Record<string, any>,
    isOperational = true
  ) {
    super(message);
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.field = field;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, field?: string, details?: Record<string, any>) {
    super(message, ErrorCategory.VALIDATION, 400, field, details);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, ErrorCategory.AUTHENTICATION, 401);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, ErrorCategory.AUTHORIZATION, 403);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, ErrorCategory.NOT_FOUND, 404);
  }
}

/**
 * Processing error (500)
 */
export class ProcessingError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, ErrorCategory.PROCESSING, 500, undefined, details);
  }
}

/**
 * Circuit breaker error (503)
 */
export class CircuitBreakerError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', retryAfter: number = 30) {
    super(message, ErrorCategory.CIRCUIT_BREAKER, 503, undefined, { retryAfter });
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter: number = 60) {
    super(message, ErrorCategory.RATE_LIMIT, 429, undefined, { retryAfter });
  }
}

/**
 * External service error (502)
 */
export class ExternalServiceError extends AppError {
  constructor(serviceName: string, message: string) {
    super(
      `External service error: ${serviceName} - ${message}`,
      ErrorCategory.EXTERNAL_SERVICE,
      502,
      undefined,
      { serviceName }
    );
  }
}

/**
 * Database error (500)
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, ErrorCategory.DATABASE, 500, undefined, details);
  }
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  error: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
  timestamp: string;
  correlationId?: string;
  retryAfter?: number;
}

/**
 * Convert error to standardized response format
 */
export function toErrorResponse(
  error: Error | AppError,
  correlationId?: string
): { statusCode: number; body: ErrorResponse } {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: error.errorCode,
        message: error.message,
        field: error.field,
        details: error.details,
        timestamp: new Date().toISOString(),
        correlationId,
        retryAfter: error.details?.retryAfter
      }
    };
  }

  // Unknown error - return generic 500
  return {
    statusCode: 500,
    body: {
      error: ErrorCategory.INTERNAL,
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      correlationId
    }
  };
}
