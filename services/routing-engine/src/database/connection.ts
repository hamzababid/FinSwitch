/**
 * MongoDB Connection
 * Handles database connection lifecycle
 */

import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.database.url);
    
    logger.info('Connected to MongoDB', {
      environment: config.server.environment,
      database: mongoose.connection.name,
    });

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB', error as Error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', error as Error);
    throw error;
  }
}
