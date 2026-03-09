/**
 * MongoDB Connection Manager
 */

import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.database.url, {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('Connected to MongoDB', {
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
  } catch (error: any) {
    logger.error('Failed to connect to MongoDB', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error: any) {
    logger.error('Failed to disconnect from MongoDB', error);
    throw error;
  }
}

export function getDatabaseConnection(): mongoose.Connection {
  return mongoose.connection;
}
