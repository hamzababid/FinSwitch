/**
 * Configuration Module
 * Loads and validates environment variables
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3002', 10),
    environment: process.env.NODE_ENV || 'development',
  },
  database: {
    url: process.env.MONGO_URL || 'mongodb://localhost:27017/finswitch',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes default
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
  services: {
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3006',
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
  },
};

// Validate critical configuration
if (!config.jwt.secret || config.jwt.secret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

if (!config.database.url) {
  throw new Error('MONGO_URL is required');
}

if (!config.redis.url) {
  throw new Error('REDIS_URL is required');
}
