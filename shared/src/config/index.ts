/**
 * Configuration management utilities
 * Implements Requirements 15.3, 15.4, 15.7
 */

/**
 * Base service configuration interface
 */
export interface ServiceConfig {
  server: {
    port: number;
    host: string;
    environment: 'development' | 'production' | 'test';
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'simple';
  };
}

/**
 * Configuration validation error
 */
export class ConfigValidationError extends Error {
  constructor(public errors: string[]) {
    super(`Configuration validation failed:\n${errors.join('\n')}`);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Get required environment variable
 * Throws error if not found
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new ConfigValidationError([`Required environment variable ${key} is not set`]);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Get environment variable as integer
 */
export function getEnvAsInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new ConfigValidationError([`Environment variable ${key} must be a valid integer`]);
  }
  return parsed;
}

/**
 * Get environment variable as boolean
 */
export function getEnvAsBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Validate port number
 */
export function validatePort(port: number): void {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigValidationError([`Port must be between 1 and 65535, got ${port}`]);
  }
}

/**
 * Validate URL format
 */
export function validateUrl(url: string, name: string): void {
  try {
    new URL(url);
  } catch (error) {
    throw new ConfigValidationError([`${name} must be a valid URL, got ${url}`]);
  }
}

/**
 * Validate JWT secret strength
 */
export function validateJWTSecret(secret: string): void {
  if (secret.length < 32) {
    throw new ConfigValidationError([
      'JWT_SECRET must be at least 32 characters long for security'
    ]);
  }
}

/**
 * Load base service configuration
 */
export function loadBaseConfig(serviceName: string): ServiceConfig {
  return {
    server: {
      port: getEnvAsInt('PORT', 3000),
      host: getOptionalEnv('HOST', '0.0.0.0'),
      environment: (getOptionalEnv('NODE_ENV', 'development') as any)
    },
    logging: {
      level: (getOptionalEnv('LOG_LEVEL', 'info') as any),
      format: (getOptionalEnv('LOG_FORMAT', 'json') as any)
    }
  };
}

/**
 * Validate base configuration
 */
export function validateBaseConfig(config: ServiceConfig): void {
  const errors: string[] = [];

  // Validate port
  try {
    validatePort(config.server.port);
  } catch (error: any) {
    errors.push(error.message);
  }

  // Validate environment
  const validEnvironments = ['development', 'production', 'test'];
  if (!validEnvironments.includes(config.server.environment)) {
    errors.push(
      `Environment must be one of ${validEnvironments.join(', ')}, got ${config.server.environment}`
    );
  }

  // Validate log level
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.logging.level)) {
    errors.push(
      `Log level must be one of ${validLogLevels.join(', ')}, got ${config.logging.level}`
    );
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }
}
