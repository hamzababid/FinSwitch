# FinSwitch Platform - Local Setup Guide

## Current Status

The User Service and Routing Engine are fully implemented and ready to run locally. Here's what's been completed:

### Completed Components
- ✅ Shared utilities library (logger, errors, config, middleware)
- ✅ User Service with authentication and RBAC
- ✅ Routing Engine with transaction routing logic
- ✅ MongoDB models (User, Role, RoutingRule, AuditLog)
- ✅ Redis caching for routing rules
- ✅ Authentication endpoints (login, token verification, refresh)
- ✅ User management endpoints (CRUD operations)
- ✅ Routing rule management endpoints (CRUD operations)
- ✅ Routing evaluation endpoint
- ✅ Audit logging for all user and routing rule actions
- ✅ Health check and metrics endpoints
- ✅ Docker configuration

## Prerequisites

Before running locally, ensure you have:

1. **Node.js 16+** installed
2. **Docker and Docker Compose** installed
3. **Git** installed

## Quick Start - User Service and Routing Engine

### Option 1: Run with Docker Compose (Recommended)

This will start MongoDB, Redis, User Service, and Routing Engine:

```bash
# 1. Build and start the shared library
cd shared
npm install
npm run build
cd ..

# 2. Start MongoDB and Redis only
docker-compose up -d mongodb redis

# 3. Wait for services to be healthy (about 10-15 seconds)
docker-compose ps

# 4. Build and start user-service
docker-compose up -d --build user-service

# 5. Wait for user-service to be healthy
docker-compose ps user-service

# 6. Build and start routing-engine
docker-compose up -d --build routing-engine

# 7. Check logs
docker-compose logs -f user-service routing-engine

# 8. Test the services
curl http://localhost:3006/health
curl http://localhost:3002/health
```

### Option 2: Run Locally (Development)

This runs the services outside Docker for faster development:

```bash
# 1. Start MongoDB and Redis with Docker
docker-compose up -d mongodb redis

# 2. Build shared library
cd shared
npm install
npm run build
cd ..

# 3. Install and run user-service
cd services/user-service
npm install
cp .env.example .env
# Edit .env and set:
# MONGO_URL=mongodb://admin:secureMongoPassword123@localhost:27017/finswitch?authSource=admin
npm run dev
# Service will start on http://localhost:3006

# 4. In a new terminal, install and run routing-engine
cd services/routing-engine
npm install
cp .env.example .env
# Edit .env and set:
# MONGO_URL=mongodb://admin:secureMongoPassword123@localhost:27017/finswitch?authSource=admin
# REDIS_URL=redis://:secureRedisPassword123@localhost:6379
npm run dev
# Service will start on http://localhost:3002
```

## Environment Variables

Create a `.env` file in the root directory or use the existing `.env.example`:

```bash
# MongoDB
MONGO_PASSWORD=secureMongoPassword123

# Redis
REDIS_PASSWORD=secureRedisPassword123

# JWT
JWT_SECRET=your-256-bit-secret-key-change-in-production-minimum-32-characters

# Service Ports
USER_SERVICE_PORT=3006
ROUTING_ENGINE_PORT=3002
```

## Testing the User Service

### 1. Health Check

```bash
curl http://localhost:3006/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "user-service",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": "1m 30s",
  "database": {
    "status": "connected",
    "type": "mongodb"
  }
}
```

### 2. Metrics

```bash
curl http://localhost:3006/metrics
```

### 3. Create a User (requires Admin user first)

First, you'll need to manually create an admin user in MongoDB:

```bash
# Connect to MongoDB
docker exec -it finswitch-mongodb mongosh -u admin -p secureMongoPassword123 --authenticationDatabase admin

# Switch to finswitch database
use finswitch

# Create admin user
db.users.insertOne({
  userId: "admin-002",
  username: "admin2",
  email: "admin2@finswitch.local",
  passwordHash: "$2y$10$hO3YHbGED9nxsAmrXcYwj.uBohnsHavgXpjHzJcGKYm0FV20kOhLW",
  roles: ["Admin"],
  isActive: true,
  metadata: {
    createdBy: "system",
    lastModifiedBy: "system"
  },
  createdAt: new Date(),
  updatedAt: new Date()
})
```

Or use the initialization script that should run automatically.

### 4. Login

```bash
curl -X POST http://localhost:3006/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 28800,
    "user": {
      "userId": "admin-001",
      "username": "admin",
      "email": "admin@finswitch.local",
      "roles": ["Admin"]
    }
  }
}
```

### 5. Create a New User (with Admin token)

```bash
TOKEN="your-jwt-token-from-login"

curl -X POST http://localhost:3006/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "username": "developer1",
    "email": "dev1@finswitch.local",
    "password": "Dev@123456",
    "roles": ["Developer"]
  }'
```

### 6. List Users

```bash
curl -X GET http://localhost:3006/api/v1/users \
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

### Issue: "Cannot find module '@finswitch/shared'"

**Solution**: Build the shared library first:
```bash
cd shared
npm install
npm run build
cd ../services/user-service
npm install
```

### Issue: "MongoDB connection failed"

**Solution**: Ensure MongoDB is running and healthy:
```bash
docker-compose ps mongodb
docker-compose logs mongodb
```

### Issue: "Port 3006 already in use"

**Solution**: Stop any existing process on port 3006:
```bash
# On Windows
netstat -ano | findstr :3006
taskkill /PID <PID> /F

# On Linux/Mac
lsof -ti:3006 | xargs kill -9
```

### Issue: TypeScript compilation errors

**Solution**: Ensure TypeScript is installed and run type checking:
```bash
cd services/user-service
npm install
npm run type-check
```

## Next Steps

Once the User Service is running successfully:

1. ✅ Test all authentication endpoints
2. ✅ Test user management endpoints
3. ✅ Verify audit logging in MongoDB
4. ✅ Check metrics endpoint
5. 🔄 Continue with other services (Routing Engine, Payment Service, etc.)

## Available Endpoints

### Public Endpoints (No Authentication)
- `GET /health` - Health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /metrics` - Service metrics
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/verify` - Verify token
- `POST /api/v1/auth/refresh` - Refresh token

### Protected Endpoints (Requires Authentication)
- `POST /api/v1/users` - Create user (Admin only)
- `GET /api/v1/users` - List users (Admin only)
- `GET /api/v1/users/:id` - Get user (Admin or self)
- `PUT /api/v1/users/:id` - Update user (Admin only)
- `DELETE /api/v1/users/:id` - Deactivate user (Admin only)

## Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Stop specific service
docker-compose stop user-service
```

## Development Workflow

For active development:

```bash
# Terminal 1: Keep MongoDB and Redis running
docker-compose up mongodb redis

# Terminal 2: Run user-service in watch mode
cd services/user-service
npm run dev

# Terminal 3: Test endpoints
curl http://localhost:3006/health
```

## Notes

- The User Service is fully functional and can be tested independently
- Other services (Payment, Routing, Settlement, etc.) are configured in docker-compose but not yet implemented
- The shared library must be built before running any service
- JWT tokens expire after 8 hours by default
- All passwords must meet complexity requirements (8+ chars, uppercase, lowercase, number, special char)


## Testing the Routing Engine

### 1. Health Check

```bash
curl http://localhost:3002/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "routing-engine",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "checks": {
    "mongodb": "healthy",
    "redis": "healthy"
  }
}
```

### 2. Metrics

```bash
curl http://localhost:3002/metrics
```

Expected response:
```json
{
  "service": "routing-engine",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "cache": {
    "hits": 150,
    "misses": 25,
    "hitRate": "85.71%"
  },
  "uptime": 3600,
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576
  }
}
```

### 3. Create a Routing Rule (requires Admin/Operations token)

First, login to get a token:

```bash
# Login as admin
curl -X POST http://localhost:3006/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123"
  }'

# Save the token
TOKEN="your-jwt-token-from-login"
```

Create a routing rule:

```bash
curl -X POST http://localhost:3002/api/v1/routing/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Visa Card Routing",
    "description": "Route all Visa cards to primary issuer",
    "priority": 100,
    "enabled": true,
    "conditions": {
      "cardBinRanges": ["4"],
      "amountRange": {
        "min": 0.01,
        "max": 10000
      },
      "currencies": ["USD", "EUR"]
    },
    "route": {
      "issuerEndpoint": "http://issuer-simulator:3003/authorize",
      "processorId": "VISA_PRIMARY",
      "timeout": 5000,
      "retryAttempts": 3
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "ruleId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Visa Card Routing",
    "description": "Route all Visa cards to primary issuer",
    "priority": 100,
    "enabled": true,
    "conditions": {
      "cardBinRanges": ["4"],
      "amountRange": {
        "min": 0.01,
        "max": 10000
      },
      "currencies": ["USD", "EUR"]
    },
    "route": {
      "issuerEndpoint": "http://issuer-simulator:3003/authorize",
      "processorId": "VISA_PRIMARY",
      "timeout": 5000,
      "retryAttempts": 3
    },
    "createdBy": "admin-001",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. List Routing Rules

```bash
curl -X GET "http://localhost:3002/api/v1/routing/rules?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Get Routing Rule by ID

```bash
RULE_ID="550e8400-e29b-41d4-a716-446655440000"

curl -X GET "http://localhost:3002/api/v1/routing/rules/$RULE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Evaluate Routing (Public endpoint - no auth required)

This endpoint is called by the payment service to determine routing:

```bash
curl -X POST http://localhost:3002/api/v1/routing/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "4111111111111111",
    "amount": 100.50,
    "currency": "USD",
    "merchantId": "MERCHANT_001",
    "transactionType": "purchase"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "matched": true,
    "fallback": false,
    "rule": {
      "ruleId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Visa Card Routing",
      "priority": 100
    },
    "route": {
      "issuerEndpoint": "http://issuer-simulator:3003/authorize",
      "processorId": "VISA_PRIMARY",
      "timeout": 5000,
      "retryAttempts": 3
    }
  }
}
```

### 7. Update Routing Rule

```bash
curl -X PUT "http://localhost:3002/api/v1/routing/rules/$RULE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "priority": 150,
    "enabled": true
  }'
```

### 8. Delete Routing Rule

```bash
curl -X DELETE "http://localhost:3002/api/v1/routing/rules/$RULE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 9. Get Cache Statistics

```bash
curl -X GET http://localhost:3002/api/v1/routing/cache/stats \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "hits": 150,
    "misses": 25,
    "hitRate": 85.71,
    "totalRequests": 175,
    "cacheSize": 5,
    "ttl": 300
  }
}
```

## Routing Engine Features

### Routing Rule Conditions

The routing engine supports multiple condition types:

1. **Card BIN Ranges**: Match card numbers by BIN (first 1-6 digits)
   - Example: `["4"]` matches all Visa cards (starting with 4)
   - Example: `["411111"]` matches specific BIN range

2. **Amount Range**: Match transactions by amount
   - Example: `{"min": 0.01, "max": 1000}` matches amounts between $0.01 and $1000

3. **Merchant IDs**: Match specific merchants
   - Example: `["MERCHANT_001", "MERCHANT_002"]`

4. **Currencies**: Match specific currencies
   - Example: `["USD", "EUR", "GBP"]`

5. **Transaction Types**: Match transaction types
   - Example: `["purchase", "refund", "authorization"]`

### Priority-Based Selection

- When multiple rules match, the rule with the highest priority wins
- Priority range: 0-1000 (higher number = higher priority)

### Default Fallback

- If no rules match, the system uses a default route
- Default route: `http://issuer-simulator:3003/authorize` with processor ID `DEFAULT`

### Caching

- Enabled routing rules are cached in Redis for 5 minutes (300 seconds)
- Cache is automatically invalidated when rules are created, updated, or deleted
- Cache-aside pattern: check cache first, fetch from database on miss

### Audit Logging

All routing rule changes are logged to the `audit_logs` collection:
- Rule creation
- Rule updates (with before/after values)
- Rule deletion

## Available Endpoints

### Routing Engine Endpoints

#### Public Endpoints (No Authentication)
- `GET /health` - Health check with MongoDB and Redis status
- `GET /metrics` - Service metrics including cache hit rate
- `POST /api/v1/routing/evaluate` - Evaluate routing for a transaction

#### Protected Endpoints (Requires Authentication)
- `GET /api/v1/routing/rules` - List all routing rules (paginated)
- `POST /api/v1/routing/rules` - Create routing rule (Admin/Operations only)
- `GET /api/v1/routing/rules/:id` - Get routing rule by ID
- `PUT /api/v1/routing/rules/:id` - Update routing rule (Admin/Operations only)
- `DELETE /api/v1/routing/rules/:id` - Delete routing rule (Admin/Operations only)
- `GET /api/v1/routing/cache/stats` - Get cache statistics (Admin/Operations only)

### User Service Endpoints

#### Public Endpoints (No Authentication)
- `GET /health` - Health check
- `GET /metrics` - Service metrics
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/verify` - Verify token
- `POST /api/v1/auth/refresh` - Refresh token

#### Protected Endpoints (Requires Authentication)
- `POST /api/v1/users` - Create user (Admin only)
- `GET /api/v1/users` - List users (Admin only)
- `GET /api/v1/users/:id` - Get user (Admin or self)
- `PUT /api/v1/users/:id` - Update user (Admin only)
- `DELETE /api/v1/users/:id` - Deactivate user (Admin only)
