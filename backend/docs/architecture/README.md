# Architecture Overview

## System Architecture

Jobsinc follows a **microservices architecture** pattern with clear separation of concerns and specialized services for different business domains.

### High-Level Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Mobile App    │    │   WhatsApp      │
│   (Web UI)      │    │                 │    │   Business API  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │      API Gateway          │
                    │     (Core Service)        │
                    │        Port: 3333         │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼────────┐    ┌───────────▼──────────┐    ┌────────▼────────┐
│   Bot Service  │    │    AI Service        │    │   External      │
│   Port: 3000   │    │   (Microservice)     │    │   Integrations  │
└───────┬────────┘    └───────────┬──────────┘    └────────┬────────┘
        │                         │                       │
        └─────────────────────────┼───────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      Message Queue        │
                    │      (RabbitMQ)           │
                    │        Port: 5672         │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼────────┐    ┌───────────▼──────────┐    ┌────────▼────────┐
│   MongoDB      │    │    PostgreSQL        │    │     Redis       │
│   (Mongoose)   │    │    (TypeORM)         │    │   (Caching)     │
└────────────────┘    └──────────────────────┘    └─────────────────┘
```

## Service Architecture

### 1. Core Service (Port: 3333)

**Primary Role**: API Gateway and Business Logic Hub

**Responsibilities**:

- REST API endpoints for web and mobile clients
- Authentication and authorization
- User management and tenant isolation
- Job posting and management
- Subscription and billing
- File/media management
- Google Calendar integration

**Key Modules**:

- `AuthModule` - JWT-based authentication
- `UserModule` - User management
- `JobModule` - Job posting and management
- `TenantModule` - Multi-tenancy support
- `SubscriptionModule` - Billing and subscriptions
- `GoogleCalenderModule` - Calendar integration

**Database**: MongoDB (Mongoose)

### 2. AI Service (Microservice)

**Primary Role**: AI/ML Processing and LLM Integration

**Responsibilities**:

- CV processing and analysis
- AI-powered chat functionality
- Document processing and vectorization
- LLM integration (Groq)
- Vector database management

**Key Modules**:

- `AiModule` - Main AI processing logic
- `GroqModule` - LLM client integration
- `VectorStoreModule` - Vector database operations
- `PdfStoreModule` - Document processing

**Message Queues**:

- `chat_queue` - AI chat processing
- `cv_queue` - CV analysis processing

**External Services**:

- Groq LLM API
- Pinecone Vector Database
- ChromaDB Vector Database

### 3. Bot Service (Port: 3000)

**Primary Role**: WhatsApp Bot Interface

**Responsibilities**:

- WhatsApp Business API integration
- Session management and state handling
- Message routing and processing
- CV upload and processing coordination
- Interview scheduling

**Key Modules**:

- `BotModule` - Main bot logic
- `WhatsAppModule` - WhatsApp API integration
- `SessionStoreModule` - Session management
- `MessageDispatcherModule` - Message routing
- `LogicModule` - Business logic orchestration

**Message Queues**:

- `cv_queue` - CV processing coordination

**External Services**:

- WhatsApp Business API

## Communication Patterns

### 1. Synchronous Communication

- **HTTP/REST**: Direct API calls between services
- **WebSocket**: Real-time communication (if implemented)

### 2. Asynchronous Communication

- **RabbitMQ**: Message queue for inter-service communication
- **Event-driven**: Services communicate via events/messages

### Message Queue Topics

| Queue Name   | Purpose            | Producers                 | Consumers  |
| ------------ | ------------------ | ------------------------- | ---------- |
| `chat_queue` | AI chat processing | Core Service              | AI Service |
| `cv_queue`   | CV analysis        | Bot Service, Core Service | AI Service |

## Data Architecture

### Database Strategy

- **MongoDB**: Primary database for Core Service (flexible schema)
- **PostgreSQL**: Relational data for Bot Service (structured data)
- **Redis**: Caching and session storage
- **Vector Databases**: Pinecone and ChromaDB for AI embeddings

### Data Flow Patterns

1. **User Registration Flow**:

    ```
    Frontend → Core Service → MongoDB → JWT Token
    ```

2. **CV Processing Flow**:

    ```
    WhatsApp → Bot Service → RabbitMQ → AI Service → Vector DB
    ```

3. **AI Chat Flow**:
    ```
    Frontend → Core Service → RabbitMQ → AI Service → LLM API
    ```

## Security Architecture

### Authentication & Authorization

- **JWT Tokens**: Access and refresh token strategy
- **Passport.js**: Authentication middleware
- **Guards**: Route protection and role-based access
- **Multi-tenancy**: Tenant isolation at application level

### Security Layers

1. **Transport Layer**: HTTPS/TLS
2. **Application Layer**: JWT validation, input sanitization
3. **Database Layer**: Connection encryption, query validation
4. **Infrastructure Layer**: Network security, firewall rules

## Scalability Patterns

### Horizontal Scaling

- **Stateless Services**: All services are stateless for easy scaling
- **Load Balancing**: Can be implemented at API gateway level
- **Database Sharding**: MongoDB supports horizontal scaling

### Vertical Scaling

- **Resource Optimization**: Efficient memory and CPU usage
- **Caching Strategy**: Redis for frequently accessed data
- **Connection Pooling**: Database connection optimization

## Monitoring & Observability

### Logging

- **Pino**: High-performance logging
- **Structured Logs**: JSON format for easy parsing
- **Log Levels**: Debug, Info, Warn, Error

### Metrics

- **Performance Monitoring**: Response times, throughput
- **Error Tracking**: Exception monitoring
- **Health Checks**: Service health endpoints

## Deployment Architecture

### Container Strategy

- **Docker**: Containerization for consistent environments
- **Multi-stage Builds**: Optimized production images
- **Environment Variables**: Configuration management

### Infrastructure

- **Cloud-native**: Designed for cloud deployment
- **Microservices**: Independent deployment and scaling
- **Service Discovery**: Dynamic service registration

## Technology Decisions

### Framework Choice: NestJS

**Rationale**:

- TypeScript-first approach
- Built-in dependency injection
- Modular architecture
- Excellent microservices support
- Strong typing and decorators

### Database Choices

**MongoDB (Core Service)**:

- Flexible schema for evolving requirements
- Excellent for document-based data
- Built-in scaling capabilities

**PostgreSQL (Bot Service)**:

- ACID compliance for critical data
- Complex query support
- Relational data integrity

**Redis**:

- High-performance caching
- Session storage
- Pub/sub capabilities

### Message Queue: RabbitMQ

**Rationale**:

- Reliable message delivery
- Multiple exchange types
- Dead letter queues
- Message persistence
- Excellent monitoring tools
