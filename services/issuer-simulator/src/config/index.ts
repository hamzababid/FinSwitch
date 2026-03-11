import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  jwtSecret: process.env.JWT_SECRET || 'your-256-bit-secret-key-change-in-production-minimum-32-characters',
  simulation: {
    defaultProcessingDelayMs: parseInt(process.env.DEFAULT_PROCESSING_DELAY_MS || '75', 10),
    approvalRatePercentage: parseInt(process.env.APPROVAL_RATE_PERCENTAGE || '95', 10),
  },
};

// Validate critical configuration
if (!config.jwtSecret || config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}
