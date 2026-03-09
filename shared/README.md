# @finswitch/shared

Shared utilities library for FinSwitch platform microservices.

## Features

- **Structured Logging**: Winston-based JSON logging with correlation ID support
- **Error Handling**: Standardized error classes and response formatting
- **Data Masking**: Utilities for masking sensitive data (card numbers, CVV, passwords)
- **Configuration Management**: Environment variable loading and validation
- **Correlation Tracking**: Request correlation across microservices

## Installation

```bash
npm install
npm run build
```

## Usage

### Logger

```typescript
import { Logger } from '@finswitch/shared';

const logger = new Logger({ serviceName: 'payment-service' });

// Set correlation context
logger.setContext({ correlationId: 'abc-123', userId: 'user_456' });

// Log messages
logger.info('Payment processed', { transactionId: 'txn_789', amount: 99.99 });
logger.error('Payment failed', new Error('Insufficient funds'));
```

### Error Handling

```typescript
import { ValidationError, toErrorResponse } from '@finswitch/shared';

// Throw typed errors
throw new ValidationError('Invalid card number', 'cardNumber');

// Convert to response
const { statusCode, body } = toErrorResponse(error, correlationId);
```

### Data Masking

```typescript
import { maskSensitiveData, maskCardNumber } from '@finswitch/shared';

// Mask individual fields
const masked = maskCardNumber('4111111111111111'); // 411111******1111

// Mask entire objects
const safeData = maskSensitiveData({
  cardNumber: '4111111111111111',
  cvv: '123',
  password: 'secret'
});
```

### Configuration

```typescript
import { getRequiredEnv, validateJWTSecret } from '@finswitch/shared';

const jwtSecret = getRequiredEnv('JWT_SECRET');
validateJWTSecret(jwtSecret);
```

### Correlation ID

```typescript
import { getOrCreateCorrelationId, createHeadersWithCorrelation } from '@finswitch/shared';

// Extract or generate correlation ID
const correlationId = getOrCreateCorrelationId(req.headers);

// Create headers for downstream requests
const headers = createHeadersWithCorrelation(correlationId, {
  'Authorization': 'Bearer token'
});
```

## Building

```bash
npm run build        # Compile TypeScript
npm run watch        # Watch mode
npm run type-check   # Type checking only
npm run clean        # Remove dist folder
```

## License

MIT
