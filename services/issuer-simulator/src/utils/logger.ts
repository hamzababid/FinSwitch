import { createLogger } from '@finswitch/shared';
import { config } from '../config';

export const logger = createLogger({ 
  serviceName: 'issuer-simulator', 
  level: config.logLevel 
});
