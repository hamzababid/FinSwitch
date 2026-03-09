/**
 * Shared utilities for FinSwitch platform
 * Exports all shared modules for use across microservices
 */

// Logger
export { Logger, createLogger, LoggerConfig, LogContext } from './logger';

// Errors
export {
  ErrorCategory,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ProcessingError,
  CircuitBreakerError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  ErrorResponse,
  toErrorResponse
} from './errors';

// Data masking
export {
  maskCardNumber,
  maskCVV,
  maskEmail,
  maskPassword,
  maskSensitiveData,
  getCardBIN,
  getCardLast4
} from './utils/data-masking';

// Configuration
export {
  ServiceConfig,
  ConfigValidationError,
  getRequiredEnv,
  getOptionalEnv,
  getEnvAsInt,
  getEnvAsBoolean,
  validatePort,
  validateUrl,
  validateJWTSecret,
  loadBaseConfig,
  validateBaseConfig
} from './config';

// Service-specific configurations
export {
  DatabaseConfig,
  RedisConfig,
  JWTConfig,
  CircuitBreakerConfig,
  RetryConfig,
  CacheConfig,
  UserServiceConfig,
  PaymentServiceConfig,
  RoutingEngineConfig,
  SettlementServiceConfig,
  APIGatewayConfig,
  loadDatabaseConfig,
  loadRedisConfig,
  loadJWTConfig,
  loadCircuitBreakerConfig,
  loadRetryConfig,
  loadCacheConfig,
  validateDatabaseConfig,
  validateCircuitBreakerConfig,
  validateRetryConfig
} from './config/service-configs';

// Middleware - Correlation
export {
  CORRELATION_ID_HEADER,
  getOrCreateCorrelationId,
  createHeadersWithCorrelation
} from './middleware/correlation';

// Middleware - Authentication
export {
  JWTPayload,
  AuthenticatedRequest,
  verifyToken,
  extractToken,
  isTokenExpired
} from './middleware/auth';

// Middleware - RBAC
export {
  Resource,
  Action,
  Permission,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyRole,
  hasAllRoles,
  requirePermission,
  requireAnyRole,
  getUserPermissions
} from './middleware/rbac';

// Middleware - Express
export {
  correlationMiddleware,
  authenticationMiddleware,
  authorizationMiddleware,
  roleAuthorizationMiddleware,
  errorHandlerMiddleware,
  requestLoggingMiddleware
} from './middleware/express-middleware';
