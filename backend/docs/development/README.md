# Development Guide

## Overview

This guide provides comprehensive instructions for setting up, developing, testing, and deploying the Jobsinc platform. It covers the development environment, workflow, and best practices.

## Prerequisites

### Required Software

- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher
- **Git**: Version 2.x or higher
- **Docker**: Version 20.x or higher (optional)
- **Docker Compose**: Version 2.x or higher (optional)

### Required Services

- **MongoDB**: Version 6.x or higher
- **PostgreSQL**: Version 14.x or higher
- **Redis**: Version 6.x or higher
- **RabbitMQ**: Version 3.x or higher

### Development Tools

- **VS Code**: Recommended IDE
- **Postman**: API testing
- **MongoDB Compass**: MongoDB GUI
- **pgAdmin**: PostgreSQL GUI
- **Redis Desktop Manager**: Redis GUI

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd jobsinc
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install service-specific dependencies
npm run install:all
```

### 3. Environment Configuration

Create environment files for each service:

#### Core Service Environment

**File**: `apps/core/.env`

```bash
# Database
MONGODB_URI=mongodb+srv://musharrafabdullah84:jQRRXeqkucn9Lgrq@jobsinc.isvw2hy.mongodb.net/

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google Calendar
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3333/google-calender/callback

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json

# Server
PORT=3333
NODE_ENV=development
```

#### Bot Service Environment

**File**: `apps/bot/.env`

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/jobsinc_bot

# WhatsApp
WHATSAPP_TOKEN=your-whatsapp-business-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_VERIFY_TOKEN=your-webhook-verify-token

# Redis
REDIS_URL=redis://localhost:6379

# Message Queue
RABBITMQ_URL=amqp://admin:admin@localhost:5672/

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json

# Server
PORT=3000
NODE_ENV=development
```

#### AI Service Environment

**File**: `apps/ai/.env`

```bash
# Groq LLM
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama3-8b-8192

# Vector Databases
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-environment
PINECONE_INDEX_NAME=cv-embeddings

CHROMA_DB_PATH=./chroma_db
CHROMA_COLLECTION_NAME=documents

# Message Queue
RABBITMQ_URL=amqp://admin:admin@localhost:5672/

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json

# AI Processing
MAX_CONCURRENT_REQUESTS=10
REQUEST_TIMEOUT=30000
```

### 4. Database Setup

#### MongoDB Setup

```bash
# Using Docker
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin \
  mongo:6.0

# Or using MongoDB Atlas (cloud)
# Use the connection string from environment variables
```

#### PostgreSQL Setup

```bash
# Using Docker
docker run -d \
  --name postgres \
  -p 5432:5432 \
  -e POSTGRES_DB=jobsinc_bot \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  postgres:14

# Create database
docker exec -it postgres psql -U postgres -c "CREATE DATABASE jobsinc_bot;"
```

#### Redis Setup

```bash
# Using Docker
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:6.2-alpine
```

#### RabbitMQ Setup

```bash
# Using Docker
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin \
  rabbitmq:3-management
```

### 5. Docker Compose Setup (Alternative)

Create `docker-compose.yml` for local development:

```yaml
version: '3.8'

services:
    mongodb:
        image: mongo:6.0
        ports:
            - '27017:27017'
        environment:
            MONGO_INITDB_ROOT_USERNAME: admin
            MONGO_INITDB_ROOT_PASSWORD: admin
        volumes:
            - mongodb_data:/data/db

    postgres:
        image: postgres:14
        ports:
            - '5432:5432'
        environment:
            POSTGRES_DB: jobsinc_bot
            POSTGRES_USER: postgres
            POSTGRES_PASSWORD: password
        volumes:
            - postgres_data:/var/lib/postgresql/data

    redis:
        image: redis:6.2-alpine
        ports:
            - '6379:6379'

    rabbitmq:
        image: rabbitmq:3-management
        ports:
            - '5672:5672'
            - '15672:15672'
        environment:
            RABBITMQ_DEFAULT_USER: admin
            RABBITMQ_DEFAULT_PASS: admin

volumes:
    mongodb_data:
    postgres_data:
```

Run with:

```bash
docker-compose up -d
```

## Development Workflow

### 1. Starting Services

#### Development Mode

```bash
# Start all services in development mode
npm run start:dev

# Start individual services
npm run start:dev:core
npm run start:dev:bot
npm run start:dev:ai
```

#### Production Mode

```bash
# Build all services
npm run build

# Start production services
npm run start:prod
```

### 2. Service-Specific Commands

#### Core Service

```bash
# Development
cd apps/core
npm run start:dev

# Build
npm run build

# Test
npm run test
npm run test:e2e
```

#### Bot Service

```bash
# Development
cd apps/bot
npm run start:dev

# Build
npm run build

# Test
npm run test
npm run test:e2e
```

#### AI Service

```bash
# Development
cd apps/ai
npm run start:dev

# Build
npm run build

# Test
npm run test
```

### 3. Database Migrations

#### MongoDB Migrations

```bash
# Core Service
cd apps/core
npm run migration:run
npm run migration:generate
npm run migration:revert
```

#### PostgreSQL Migrations

```bash
# Bot Service
cd apps/bot
npm run migration:run
npm run migration:generate
npm run migration:revert
```

### 4. Code Quality

#### Linting

```bash
# Lint all code
npm run lint

# Lint specific service
npm run lint:core
npm run lint:bot
npm run lint:ai

# Fix linting issues
npm run lint:fix
```

#### Formatting

```bash
# Format all code
npm run format

# Format specific service
npm run format:core
npm run format:bot
npm run format:ai
```

#### Type Checking

```bash
# Type check all services
npm run type-check

# Type check specific service
npm run type-check:core
npm run type-check:bot
npm run type-check:ai
```

## Testing Strategy

### 1. Unit Testing

#### Test Structure

```
apps/
├── core/
│   ├── src/
│   └── test/
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── bot/
│   ├── src/
│   └── test/
│       ├── unit/
│       ├── integration/
│       └── e2e/
└── ai/
    ├── src/
    └── test/
        ├── unit/
        ├── integration/
        └── e2e/
```

#### Running Tests

```bash
# Run all tests
npm run test

# Run specific service tests
npm run test:core
npm run test:bot
npm run test:ai

# Run with coverage
npm run test:cov

# Run in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e
```

#### Test Configuration

**Jest Configuration** (`jest.config.js`):

```javascript
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/apps/', '<rootDir>/libs/'],
    collectCoverageFrom: ['**/*.(t|j)s', '!**/*.spec.ts', '!**/*.e2e-spec.ts'],
    coverageDirectory: './coverage',
    testMatch: ['**/*.spec.ts'],
    moduleNameMapper: {
        '^@app/common(|/.*)$': '<rootDir>/libs/common/src/$1',
    },
};
```

### 2. Integration Testing

#### API Testing

```bash
# Test Core Service APIs
npm run test:api:core

# Test Bot Service APIs
npm run test:api:bot

# Test AI Service (message queue)
npm run test:api:ai
```

#### Database Testing

```bash
# Test MongoDB operations
npm run test:db:core

# Test PostgreSQL operations
npm run test:db:bot
```

### 3. End-to-End Testing

#### E2E Test Setup

```bash
# Setup test databases
npm run test:setup

# Run E2E tests
npm run test:e2e

# Cleanup test data
npm run test:cleanup
```

#### E2E Test Examples

```typescript
// apps/core/test/app.e2e-spec.ts
describe('Core Service (e2e)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    it('/auth/login (POST)', () => {
        return request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123',
            })
            .expect(200)
            .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data.access_token).toBeDefined();
            });
    });
});
```

## Debugging

### 1. VS Code Debugging

Create `.vscode/launch.json`:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug Core Service",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/apps/core/src/main.ts",
            "preLaunchTask": "tsc: build - apps/core/tsconfig.json",
            "outFiles": ["${workspaceFolder}/apps/core/dist/**/*.js"],
            "env": {
                "NODE_ENV": "development"
            },
            "console": "integratedTerminal"
        },
        {
            "name": "Debug Bot Service",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/apps/bot/src/main.ts",
            "preLaunchTask": "tsc: build - apps/bot/tsconfig.json",
            "outFiles": ["${workspaceFolder}/apps/bot/dist/**/*.js"],
            "env": {
                "NODE_ENV": "development"
            },
            "console": "integratedTerminal"
        },
        {
            "name": "Debug AI Service",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/apps/ai/src/main.ts",
            "preLaunchTask": "tsc: build - apps/ai/tsconfig.json",
            "outFiles": ["${workspaceFolder}/apps/ai/dist/**/*.js"],
            "env": {
                "NODE_ENV": "development"
            },
            "console": "integratedTerminal"
        }
    ]
}
```

### 2. Logging

#### Log Levels

```typescript
// Debug logging
this.logger.debug('Debug information', { data });

// Info logging
this.logger.info('User action', { userId, action });

// Warning logging
this.logger.warn('Warning condition', { warning });

// Error logging
this.logger.error('Error occurred', { error, stack });
```

#### Log Configuration

```typescript
// apps/core/src/main.ts
import { Logger } from '@nestjs/common';

const logger = new Logger('Main');

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // ... rest of bootstrap
}
```

### 3. Database Debugging

#### MongoDB Debugging

```bash
# Connect to MongoDB shell
docker exec -it mongodb mongosh

# Show collections
show collections

# Query documents
db.users.find({})

# Show indexes
db.users.getIndexes()
```

#### PostgreSQL Debugging

```bash
# Connect to PostgreSQL
docker exec -it postgres psql -U postgres -d jobsinc_bot

# Show tables
\dt

# Query data
SELECT * FROM "Applicant" LIMIT 10;

# Show indexes
\di
```

## Performance Optimization

### 1. Database Optimization

#### MongoDB Optimization

```typescript
// Create indexes
await UserSchema.index({ emailAddress: 1 });
await UserSchema.index({ tenantId: 1 });
await JobSchema.index({ tenantId: 1, jobStatus: 1 });

// Use projection for selective field retrieval
const users = await this.userModel.find({}, { name: 1, email: 1 });

// Use aggregation for complex queries
const result = await this.jobModel.aggregate([
    { $match: { tenantId: tenantId } },
    { $group: { _id: '$jobStatus', count: { $sum: 1 } } },
]);
```

#### PostgreSQL Optimization

```typescript
// Create indexes
await queryRunner.createIndex('Applicant', {
    name: 'IX_Applicant_jobId',
    columnNames: ['jobId'],
});

// Use prepared statements
const result = await this.applicantRepository
    .createQueryBuilder('applicant')
    .where('applicant.jobId = :jobId', { jobId })
    .getMany();
```

### 2. Caching Strategy

#### Redis Caching

```typescript
// Cache frequently accessed data
const cacheKey = `user:${userId}`;
let user = await this.redisService.get(cacheKey);

if (!user) {
    user = await this.userService.findById(userId);
    await this.redisService.setex(cacheKey, 3600, JSON.stringify(user));
}
```

#### Application Caching

```typescript
// Use NestJS cache interceptor
@UseInterceptors(CacheInterceptor)
@CacheKey('users')
@CacheTTL(3600)
async findAll(): Promise<User[]> {
  return this.userService.findAll();
}
```

### 3. Message Queue Optimization

#### Queue Configuration

```typescript
// Configure queue for performance
const queueOptions = {
    durable: true,
    maxPriority: 10,
    messageTtl: 60000,
    deadLetterExchange: 'dlx',
    deadLetterRoutingKey: 'dlq',
};
```

#### Batch Processing

```typescript
// Process messages in batches
@MessagePattern('cv_queue')
async handleCVBatch(messages: CVMessage[]) {
  const batchSize = 10;

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    await Promise.all(batch.map(msg => this.processCV(msg)));
  }
}
```

## Deployment

### 1. Production Environment

#### Environment Variables

```bash
# Production environment variables
NODE_ENV=production
PORT=3333
LOG_LEVEL=info

# Database
MONGODB_URI=mongodb+srv://...
DATABASE_URL=postgresql://...

# External Services
GROQ_API_KEY=your-production-key
PINECONE_API_KEY=your-production-key
WHATSAPP_TOKEN=your-production-token
```

#### Docker Production

```dockerfile
# Dockerfile for production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3333
CMD ["node", "dist/apps/core/main"]
```

### 2. CI/CD Pipeline

#### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
    push:
        branches: [main, develop]
    pull_request:
        branches: [main]

jobs:
    test:
        runs-on: ubuntu-latest

        services:
            mongodb:
                image: mongo:6.0
                ports:
                    - 27017:27017
            postgres:
                image: postgres:14
                env:
                    POSTGRES_PASSWORD: password
                ports:
                    - 5432:5432
                options: >-
                    --health-cmd pg_isready
                    --health-interval 10s
                    --health-timeout 5s
                    --health-retries 5

        steps:
            - uses: actions/checkout@v3

            - name: Setup Node.js
              uses: actions/setup-node@v3
              with:
                  node-version: '18'
                  cache: 'npm'

            - name: Install dependencies
              run: npm ci

            - name: Run tests
              run: npm run test

            - name: Run e2e tests
              run: npm run test:e2e

            - name: Build
              run: npm run build

            - name: Deploy to staging
              if: github.ref == 'refs/heads/develop'
              run: echo "Deploy to staging"

            - name: Deploy to production
              if: github.ref == 'refs/heads/main'
              run: echo "Deploy to production"
```

### 3. Monitoring and Health Checks

#### Health Check Endpoints

```typescript
// Health check controller
@Controller('health')
export class HealthController {
    @Get()
    async check() {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: await this.checkDatabase(),
                redis: await this.checkRedis(),
                rabbitmq: await this.checkRabbitMQ(),
            },
        };
    }
}
```

#### Monitoring Setup

```typescript
// Application monitoring
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

const exporter = new PrometheusExporter({
    port: 9464,
    endpoint: '/metrics',
});
```

## Troubleshooting

### 1. Common Issues

#### Database Connection Issues

```bash
# Check MongoDB connection
docker exec -it mongodb mongosh --eval "db.runCommand('ping')"

# Check PostgreSQL connection
docker exec -it postgres pg_isready -U postgres

# Check Redis connection
docker exec -it redis redis-cli ping
```

#### Message Queue Issues

```bash
# Check RabbitMQ status
docker exec -it rabbitmq rabbitmqctl status

# Check queue status
docker exec -it rabbitmq rabbitmqctl list_queues

# Check connections
docker exec -it rabbitmq rabbitmqctl list_connections
```

#### Service Startup Issues

```bash
# Check service logs
docker logs <service-name>

# Check port availability
netstat -tulpn | grep :3333

# Check environment variables
echo $NODE_ENV
echo $MONGODB_URI
```

### 2. Performance Issues

#### Memory Leaks

```bash
# Monitor memory usage
node --inspect apps/core/src/main.ts

# Use heap snapshots
node --inspect --inspect-brk apps/core/src/main.ts
```

#### Slow Queries

```bash
# MongoDB slow query log
docker exec -it mongodb mongosh --eval "db.setProfilingLevel(2)"

# PostgreSQL slow query log
docker exec -it postgres psql -U postgres -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"
```

### 3. Debugging Tools

#### VS Code Extensions

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **MongoDB for VS Code**: MongoDB integration
- **PostgreSQL**: PostgreSQL integration
- **Docker**: Docker integration

#### Command Line Tools

```bash
# Process monitoring
htop
iotop

# Network monitoring
netstat -tulpn
ss -tulpn

# Disk usage
df -h
du -sh *
```

## Best Practices

### 1. Code Organization

- Follow NestJS module structure
- Use dependency injection
- Implement proper error handling
- Write comprehensive tests
- Use TypeScript strict mode

### 2. Security

- Validate all inputs
- Use environment variables for secrets
- Implement proper authentication
- Use HTTPS in production
- Regular security updates

### 3. Performance

- Use database indexes
- Implement caching strategies
- Optimize database queries
- Use connection pooling
- Monitor application metrics

### 4. Testing

- Write unit tests for all services
- Implement integration tests
- Use E2E tests for critical flows
- Maintain high test coverage
- Use test data factories

### 5. Documentation

- Keep documentation updated
- Use JSDoc comments
- Document API endpoints
- Maintain changelog
- Write deployment guides
