# FinSwitch Platform - Local Setup Guide

## Current Status

The User Service is fully implemented and ready to run locally. Here's what's been completed:

### Completed Components
- ✅ Shared utilities library (logger, errors, config, middleware)
- ✅ User Service with authentication and RBAC
- ✅ MongoDB models (User, Role, AuditLog)
- ✅ Authentication endpoints (login, token verification, refresh)
- ✅ User management endpoints (CRUD operations)
- ✅ Audit logging for all user actions
- ✅ Health check and metrics endpoints
- ✅ Docker configuration

## Prerequisites

Before running locally, ensure you have:

1. **Node.js 16+** installed
2. **Docker and Docker Compose** installed
3. **Git** installed

## Quick Start - User Service Only

### Option 1: Run with Docker Compose (Recommended)

This will start MongoDB, Redis, and the User Service:

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
docker-compose up -d user-service

# 5. Check logs
docker-compose logs -f user-service

# 6. Test the service
curl http://localhost:3006/health
```

### Option 2: Run Locally (Development)

This runs the service outside Docker for faster development:

```bash
# 1. Start MongoDB and Redis with Docker
docker-compose up -d mongodb redis

# 2. Build shared library
cd shared
npm install
npm run build
cd ..

# 3. Install user-service dependencies
cd services/user-service
npm install

# 4. Create .env file
cp .env.example .env

# 5. Update .env with local MongoDB connection
# Edit .env and set:
# MONGO_URL=mongodb://admin:secureMongoPassword123@localhost:27017/finswitch?authSource=admin

# 6. Run in development mode
npm run dev

# Service will start on http://localhost:3006
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
