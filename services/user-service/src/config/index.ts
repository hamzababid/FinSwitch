/**
 * User Service Configuration
 * Loads and validates configuration from environment variables
 */

import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

export interface UserServiceConfig {
  server: {
    port: number;
    environment: string;
  };
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  bcrypt: {
    saltRounds: number;
  };
  logging: {
    level: string;
  };
}

function loadConfig(): UserServiceConfig {
  return {
    server: {
      port: parseInt(process.env.PORT || '3006', 10),
      environment: process.env.NODE_ENV || 'development',
    },
    database: {
      url: process.env.MONGO_URL || 'mongodb://localhost:27017/finswitch',
    },
    jwt: {
      secret: process.env.JWT_SECRET || '',
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    },
    bcrypt: {
      saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
    },
  };
}

function validateConfig(config: UserServiceConfig): void {
  const errors: string[] = [];

  if (!config.jwt.secret) {
    errors.push('JWT_SECRET is required');
  }

  if (config.jwt.secret && config.jwt.secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  if (!config.database.url) {
    errors.push('MONGO_URL is required');
  }

  if (config.bcrypt.saltRounds < 10) {
    errors.push('BCRYPT_SALT_ROUNDS must be at least 10');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

export const config = loadConfig();
validateConfig(config);
