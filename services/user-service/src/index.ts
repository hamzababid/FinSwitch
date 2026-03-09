/**
 * User Service Entry Point
 * Starts the Express server and connects to MongoDB
 */

import { createApp } from './app';
import { connectDatabase } from './database/connection';
import { config } from './config';
import { logger } from './utils/logger';

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    logger.info('Database connected successfully');

    // Create Express app
    const app = createApp();

    // Start server
    const port = config.server.port;
    app.listen(port, '0.0.0.0', () => {
      logger.info(`User Service started`, {
        port,
        environment: config.server.environment,
        mongoUri: config.database.url.replace(/\/\/.*@/, '//***@'), // Mask credentials
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

startServer();
