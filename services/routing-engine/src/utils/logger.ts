/**
 * Logger instance for Routing Engine
 */

import { Logger } from '@finswitch/shared';
import { config } from '../config';

export const logger = new Logger({
  serviceName: 'routing-engine',
  level: config.logging.level,
  format: 'json',
});
