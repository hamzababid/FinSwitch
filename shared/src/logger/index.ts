import winston from 'winston';

export interface LoggerConfig {
  serviceName: string;
  level?: string;
  format?: 'json' | 'simple';
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  transactionId?: string;
  duration?: number;
  [key: string]: any;
}

/**
 * Creates a structured JSON logger with correlation ID support
 * Implements Requirements 13.1, 13.2, 13.7
 */
export function createLogger(config: LoggerConfig): winston.Logger {
  const { serviceName, level = 'info', format = 'json' } = config;

  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    format === 'json' ? winston.format.json() : winston.format.simple()
  );

  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || level,
    format: logFormat,
    defaultMeta: {
      service: serviceName,
      environment: process.env.NODE_ENV || 'development'
    },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
          })
        )
      })
    ]
  });

  // Add file transports in production
  if (process.env.NODE_ENV === 'production') {
    logger.add(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.json()
      })
    );
    logger.add(
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.json()
      })
    );
  }

  return logger;
}

/**
 * Logger wrapper with context support
 */
export class Logger {
  private logger: winston.Logger;
  private context: LogContext = {};

  constructor(config: LoggerConfig) {
    this.logger = createLogger(config);
  }

  /**
   * Set context that will be included in all subsequent log entries
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear specific context keys or all context
   */
  clearContext(keys?: string[]): void {
    if (keys) {
      keys.forEach(key => delete this.context[key]);
    } else {
      this.context = {};
    }
  }

  /**
   * Get current context
   */
  getContext(): LogContext {
    return { ...this.context };
  }

  private log(level: string, message: string, meta?: LogContext): void {
    this.logger.log(level, message, { ...this.context, ...meta });
  }

  debug(message: string, meta?: LogContext): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: LogContext): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: LogContext): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error | any, meta?: LogContext): void {
    const errorMeta = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code || error.name
      }
    } : {};
    this.log('error', message, { ...errorMeta, ...meta });
  }
}

export default Logger;
