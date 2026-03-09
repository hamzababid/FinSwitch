# FinSwitch Payment Switch Simulator

A complete FinTech payment switch simulator that replicates real-world payment networks (Visa/Mastercard) for local development and testing.

## Overview

FinSwitch provides a full-stack microservices platform for simulating end-to-end payment processing flows including:

- Merchant Payment API
- Intelligent Routing Engine
- Issuer Bank Simulator
- Retry Mechanism & Circuit Breaker
- Settlement & Reconciliation Engines
- Transaction Ledger
- Admin Portal with RBAC
- User Management & Audit Logs

## Architecture

The platform consists of:

- **7 Microservices**: API Gateway, Payment Service, Routing Engine, Issuer Simulator, Settlement Service, Reconciliation Service, User Service
- **Admin Portal**: Next.js frontend + Express backend
- **Infrastructure**: MongoDB, Redis, Docker Compose orchestration

## Tech Stack

- **Backend**: Node.js 16+, TypeScript, NestJS/Express
- **Frontend**: Next.js, React, TailwindCSS
- **Database**: MongoDB
- **Cache**: Redis
- **Authentication**: JWT with RBAC (Admin, Operations, Auditor, Developer)
- **Observability**: Structured logging (Winston), metrics endpoints

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 16+ (for local development)
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd finswitch-platform
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration (especially JWT_SECRET)

4. Start all services:
```bash
docker-compose up -d
```

5. Wait for all services to be healthy (about 60 seconds):
```bash
docker-compose ps
```

6. Access the platform:
- **API Gateway**: http://localhost:3000
- **Admin Portal**: http://localhost:4000
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

### Default Credentials

- **Username**: admin
- **Password**: admin123

⚠️ **IMPORTANT**: Change the default admin password after first login!

## Service Ports

| Service | Port |
|---------|------|
| API Gateway | 3000 |
| Payment Service | 3001 |
| Routing Engine | 3002 |
| Issuer Simulator | 3003 |
| Settlement Service | 3004 |
| Reconciliation Service | 3005 |
| User Service | 3006 |
| Portal Backend | 4001 |
| Portal Frontend | 4000 |
| MongoDB | 27017 |
| Redis | 6379 |

## API Documentation

OpenAPI specification available at: `specs/api.yaml`

### Example: Process a Payment

```bash
# 1. Login to get JWT token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# 2. Process payment (use token from step 1)
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "merchantId": "merchant_123",
    "cardNumber": "4111111111111111",
    "expiryDate": "12/25",
    "cvv": "123",
    "amount": 99.99,
    "currency": "USD"
  }'
```

## Project Structure

```
finswitch-platform/
├── services/                    # Microservices
│   ├── api-gateway/
│   ├── payment-service/
│   ├── routing-engine/
│   ├── issuer-simulator/
│   ├── settlement-service/
│   ├── reconciliation-service/
│   └── user-service/
├── portal/                      # Admin Portal
│   ├── frontend/               # Next.js
│   └── backend/                # Express
├── infrastructure/              # Docker & configs
│   └── mongo-init/             # MongoDB init scripts
├── specs/                       # API specifications
│   └── api.yaml
├── docs/                        # Documentation
├── docker-compose.yml
└── README.md
```

## Development

### Running Individual Services

```bash
# Start only MongoDB and Redis
docker-compose up -d mongodb redis

# Start a specific service
docker-compose up -d user-service

# View logs
docker-compose logs -f payment-service

# Rebuild a service
docker-compose up -d --build payment-service
```

### Running Tests

```bash
# Navigate to a service directory
cd services/payment-service

# Install dependencies
npm install

# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run property-based tests
npm run test:properties
```

## Performance Goals

- **Throughput**: 5000 TPS
- **Latency**: <150ms (95th percentile)
- **Availability**: 99.9%

## RBAC Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all resources |
| **Operations** | Manage routing, settlements, view payments |
| **Auditor** | Read-only access to payments, settlements, reconciliation, audit logs |
| **Developer** | Create/read payments, read routing rules |

## Monitoring

Each service exposes:
- **Health Check**: `GET /health`
- **Metrics**: `GET /metrics`

## Troubleshooting

### Services not starting

```bash
# Check service logs
docker-compose logs <service-name>

# Restart all services
docker-compose restart

# Clean restart
docker-compose down
docker-compose up -d
```

### Database connection issues

```bash
# Check MongoDB health
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check Redis health
docker-compose exec redis redis-cli ping
```

### Port conflicts

If ports are already in use, update the port mappings in `docker-compose.yml`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue in the repository
- Check the documentation in `/docs`
- Review the API specification in `/specs/api.yaml`

## Roadmap

- [ ] RabbitMQ integration for async messaging
- [ ] Prometheus + Grafana monitoring
- [ ] Kubernetes deployment manifests
- [ ] Load testing suite
- [ ] API rate limiting enhancements
- [ ] Multi-currency support
- [ ] Chargeback processing
- [ ] Fraud detection simulation

---

**Built with ❤️ for FinTech developers and architects**
