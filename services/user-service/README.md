# User Service

User authentication and RBAC management service for FinSwitch platform.

## Features

- User registration and authentication
- JWT token generation and validation
- Role-Based Access Control (RBAC)
- Password hashing with bcrypt
- Audit logging for authentication attempts
- Health check endpoint

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh JWT token

### User Management
- `POST /api/v1/users` - Create user (Admin only)
- `GET /api/v1/users` - List users (Admin only)
- `GET /api/v1/users/:id` - Get user by ID
- `PUT /api/v1/users/:id` - Update user (Admin only)
- `DELETE /api/v1/users/:id` - Deactivate user (Admin only)

### Health
- `GET /health` - Health check endpoint
- `GET /metrics` - Service metrics

## Roles

- **Admin**: Full access to all resources
- **Operations**: Manage routing, settlements, view payments
- **Auditor**: Read-only access to payments, settlements, reconciliation, audit logs
- **Developer**: Create/read payments, read routing rules

## Environment Variables

See `.env.example` for required configuration.

## Development

```bash
# Install shared dependencies first
cd ../../shared
npm install
npm run build

# Return to user-service
cd ../services/user-service

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Docker

```bash
# Build image
docker build -t finswitch-user-service .

# Run container
docker run -p 3006:3006 --env-file .env finswitch-user-service
```

## Architecture

Follows clean architecture pattern:

```
src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic
├── repositories/    # Data access layer
├── models/          # MongoDB schemas
├── middleware/      # Express middleware
├── utils/           # Utility functions
└── config/          # Configuration
```

## Security

- Passwords hashed with bcrypt (10+ salt rounds)
- JWT tokens with HS256 algorithm
- 8-hour token expiration
- RBAC enforcement on all protected endpoints
