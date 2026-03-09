/**
 * Service-specific configuration interfaces and loaders
 * Extends base configuration for each microservice
 */

import {
  ServiceConfig,
  getRequiredEnv,
  getOptionalEnv,
  getEnvAsInt,
  validateUrl,
  validateJWTSecret,
  ConfigValidationError
} from './index';

/**
 * Database configuration
 */
export interface DatabaseConfig {
  url: string;
  options: {
    maxPoolSize: number;
    minPoolSize: number;
    serverSelectionTimeoutMS: number;
  };
}

/**
 * Redis configuration
 */
export interface RedisConfig {
  url: string;
  options: {
    maxRetriesPerRequest: number;
    enableReadyCheck: boolean;
  };
}

/**
 * JWT configuration
 */
export interface JWTConfig {
  secret: string;
  algorithm: 'HS256' | 'RS256';
  expiresIn: string;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number;
  halfOpenRequests: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  ttl: number;
  maxSize: number;
}

/**
 * User Service configuration
 */
export interface UserServiceConfig extends ServiceConfig {
  database: DatabaseConfig;
  jwt: JWTConfig;
  bcrypt: {
    saltRounds: number;
  };
}

/**
 * Payment Service configuration
 */
export interface PaymentServiceConfig extends ServiceConfig {
  database: DatabaseConfig;
  redis: RedisConfig;
  services: {
    routingEngine: string;
    issuerSimulator: string;
  };
  jwt: JWTConfig;
  circuitBreaker: CircuitBreakerConfig;
  retry: RetryConfig;
}

/**
 * Routing Engine configuration
 */
export interface RoutingEngineConfig extends ServiceConfig {
  database: DatabaseConfig;
  redis: RedisConfig;
  cache: CacheConfig;
  defaultRoute: {
    issuerEndpoint: string;
    processorId: string;
  };
}

/**
 * Settlement Service configuration
 */
export interface SettlementServiceConfig extends ServiceConfig {
  database: DatabaseConfig;
  fees: {
    transactionFeePercent: number;
    transactionFeeFixed: number;
  };
}

/**
 * API Gateway configuration
 */
export interface APIGatewayConfig extends ServiceConfig {
  services: {
    userService: string;
    paymentService: string;
    routingEngine: string;
    settlementService: string;
    reconciliationService: string;
  };
  jwt: JWTConfig;
  rateLimits: {
    payments: number;
    admin: number;
  };
}

/**
 * Load database configuration
 */
export function loadDatabaseConfig(): DatabaseConfig {
  const url = getRequiredEnv('MONGO_URL');
  validateUrl(url, 'MONGO_URL');

  return {
    url,
    options: {
      maxPoolSize: getEnvAsInt('DB_MAX_POOL_SIZE', 50),
      minPoolSize: getEnvAsInt('DB_MIN_POOL_SIZE', 10),
      serverSelectionTimeoutMS: getEnvAsInt('DB_TIMEOUT', 5000)
    }
  };
}

/**
 * Load Redis configuration
 */
export function loadRedisConfig(): RedisConfig {
  const url = getRequiredEnv('REDIS_URL');
  validateUrl(url, 'REDIS_URL');

  return {
    url,
    options: {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true
    }
  };
}

/**
 * Load JWT configuration
 */
export function loadJWTConfig(): JWTConfig {
  const secret = getRequiredEnv('JWT_SECRET');
  validateJWTSecret(secret);

  return {
    secret,
    algorithm: 'HS256',
    expiresIn: getOptionalEnv('JWT_EXPIRES_IN', '8h')
  };
}

/**
 * Load circuit breaker configuration
 */
export function loadCircuitBreakerConfig(): CircuitBreakerConfig {
  return {
    failureThreshold: getEnvAsInt('CIRCUIT_BREAKER_THRESHOLD', 5),
    timeout: getEnvAsInt('CIRCUIT_BREAKER_TIMEOUT', 30000),
    halfOpenRequests: 3
  };
}

/**
 * Load retry configuration
 */
export function loadRetryConfig(): RetryConfig {
  return {
    maxAttempts: getEnvAsInt('RETRY_MAX_ATTEMPTS', 3),
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };
}

/**
 * Load cache configuration
 */
export function loadCacheConfig(): CacheConfig {
  return {
    ttl: getEnvAsInt('CACHE_TTL', 300),
    maxSize: 10000
  };
}

/**
 * Validate database configuration
 */
export function validateDatabaseConfig(config: DatabaseConfig): void {
  const errors: string[] = [];

  if (config.options.maxPoolSize < config.options.minPoolSize) {
    errors.push('maxPoolSize must be greater than or equal to minPoolSize');
  }

  if (config.options.serverSelectionTimeoutMS < 1000) {
    errors.push('serverSelectionTimeoutMS must be at least 1000ms');
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }
}

/**
 * Validate circuit breaker configuration
 */
export function validateCircuitBreakerConfig(config: CircuitBreakerConfig): void {
  const errors: string[] = [];

  if (config.failureThreshold < 1) {
    errors.push('Circuit breaker failureThreshold must be at least 1');
  }

  if (config.timeout < 1000) {
    errors.push('Circuit breaker timeout must be at least 1000ms');
  }

  if (config.halfOpenRequests < 1) {
    errors.push('Circuit breaker halfOpenRequests must be at least 1');
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }
}

/**
 * Validate retry configuration
 */
export function validateRetryConfig(config: RetryConfig): void {
  const errors: string[] = [];

  if (config.maxAttempts < 1) {
    errors.push('Retry maxAttempts must be at least 1');
  }

  if (config.initialDelay < 100) {
    errors.push('Retry initialDelay must be at least 100ms');
  }

  if (config.maxDelay < config.initialDelay) {
    errors.push('Retry maxDelay must be greater than or equal to initialDelay');
  }

  if (config.backoffMultiplier < 1) {
    errors.push('Retry backoffMultiplier must be at least 1');
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }
}
