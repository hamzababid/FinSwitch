/**
 * Routing Engine Entry Point
 * Starts the Express server and connects to MongoDB and Redis
 */

import { createApp } from './app';
import { connectDatabase } from './database/connection';
import { redisClient } from './cache/RedisClient';
import { config } from './config';
import { logger } from './utils/logger';

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    logger.info('Database connected successfully');

    // Connect to Redis
    await redisClient.connect();
    logger.info('Redis connected successfully');

    // Create Express app
    const app = createApp();

    // Start server
    const port = config.server.port;
    app.listen(port, '0.0.0.0', () => {
      logger.info(`Routing Engine started`, {
        port,
        environment: config.server.environment,
        mongoUri: config.database.url.replace(/\/\/.*@/, '//***@'), // Mask credentials
        redisUri: config.redis.url.replace(/:[^:@]+@/, ':***@'), // Mask password
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await redisClient.disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      await redisClient.disconnect();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

startServer();
