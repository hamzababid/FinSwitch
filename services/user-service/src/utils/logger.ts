/**
 * Logger instance for User Service
 */

import { Logger } from '@finswitch/shared';
import { config } from '../config';

export const logger = new Logger({
  serviceName: 'user-service',
  level: config.logging.level,
  format: 'json',
});
