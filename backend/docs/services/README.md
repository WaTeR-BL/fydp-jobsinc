# Service Documentation

## Overview

Jobsinc consists of three main services, each with specific responsibilities and specialized functionality. This document provides detailed information about each service's architecture, modules, and configuration.

## Service Directory Structure

```
apps/
├── core/                    # Main business logic service
│   ├── src/
│   │   ├── auth/           # Authentication & authorization
│   │   ├── user/           # User management
│   │   ├── job/            # Job posting & management
│   │   ├── tenant/         # Multi-tenancy
│   │   ├── subscription/   # Billing & subscriptions
│   │   ├── domain/         # Domain management
│   │   ├── google-calender/ # Calendar integration
│   │   ├── media-manager/  # File management
│   │   ├── common/         # Shared utilities
│   │   └── schemas/        # MongoDB schemas
│   └── main.ts
├── ai/                      # AI/ML processing service
│   ├── src/
│   │   ├── ai.handler.ts   # Message handlers
│   │   ├── ai.service.ts   # AI processing logic
│   │   ├── llm-client/     # LLM integration
│   │   ├── groq-queue/     # Queue processing
│   │   ├── pdf-store/      # Document processing
│   │   ├── prompts/        # AI prompts
│   │   └── utils/          # Utilities
│   └── main.ts
└── bot/                     # WhatsApp bot service
    ├── src/
    │   ├── bot.controller.ts # HTTP endpoints
    │   ├── bot.service.ts   # Bot orchestration
    │   ├── whatsapp/        # WhatsApp integration
    │   ├── session-store/   # Session management
    │   ├── message-dispatcher/ # Message routing
    │   ├── logic/           # Business logic
    │   ├── entities/        # Database entities
    │   └── utils/           # Utilities
    └── main.ts
```

---

## Core Service

**Port**: 3333  
**Database**: MongoDB (Mongoose)  
**Primary Role**: API Gateway and Business Logic Hub

### Architecture Overview

The Core Service serves as the main entry point for all client applications and handles the primary business logic of the recruitment platform.

### Key Modules

#### 1. AuthModule

**Location**: `apps/core/src/auth/`

**Responsibilities**:

- JWT-based authentication
- Access and refresh token management
- Password hashing and validation
- Role-based access control

**Key Components**:

- `AuthController` - Authentication endpoints
- `AuthService` - Authentication business logic
- `AtStrategy` - Access token strategy
- `RtStrategy` - Refresh token strategy

**Endpoints**:

- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `POST /auth/logout` - User logout

#### 2. UserModule

**Location**: `apps/core/src/user/`

**Responsibilities**:

- User CRUD operations
- Profile management
- User preferences
- Account settings

**Key Components**:

- `UserController` - User management endpoints
- `UserService` - User business logic
- `UserSchema` - MongoDB user schema

**Endpoints**:

- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile
- `GET /user/preferences` - Get user preferences

#### 3. JobModule

**Location**: `apps/core/src/job/`

**Responsibilities**:

- Job posting and management
- Job search and filtering
- Application tracking
- Job analytics

**Key Components**:

- `JobController` - Job management endpoints
- `JobService` - Job business logic
- `JobSchema` - MongoDB job schema

**Endpoints**:

- `POST /job` - Create job posting
- `GET /job` - List jobs
- `GET /job/:id` - Get job details
- `PUT /job/:id` - Update job

#### 4. TenantModule

**Location**: `apps/core/src/tenant/`

**Responsibilities**:

- Multi-tenancy support
- Tenant isolation
- Organization management
- Billing integration

**Key Components**:

- `TenantController` - Tenant management endpoints
- `TenantService` - Tenant business logic
- `TenantSchema` - MongoDB tenant schema

#### 5. SubscriptionModule

**Location**: `apps/core/src/subscription/`

**Responsibilities**:

- Subscription management
- Billing and payments
- Plan management
- Usage tracking

**Key Components**:

- `SubscriptionController` - Subscription endpoints
- `SubscriptionService` - Subscription business logic
- `SubscriptionSchema` - MongoDB subscription schema

#### 6. GoogleCalenderModule

**Location**: `apps/core/src/google-calender/`

**Responsibilities**:

- Google Calendar integration
- Interview scheduling
- Calendar event management
- OAuth2 authentication

**Key Components**:

- `GoogleCalenderController` - Calendar endpoints
- `GoogleCalenderService` - Calendar business logic

### Configuration

**Environment Variables**:

```bash
# Database
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Google Calendar
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## AI Service

**Type**: Microservice (No HTTP port)  
**Message Queues**: `chat_queue`, `cv_queue`  
**Primary Role**: AI/ML Processing and LLM Integration

### Architecture Overview

The AI Service is a pure microservice that processes AI-related tasks through message queues. It handles CV analysis, AI chat, and document processing.

### Key Modules

#### 1. AiModule

**Location**: `apps/ai/src/`

**Responsibilities**:

- Message queue handling
- AI processing orchestration
- Response formatting

**Key Components**:

- `AiHandler` - Message queue handlers
- `AiService` - AI processing logic
- `AiModule` - Module configuration

#### 2. GroqModule

**Location**: `apps/ai/src/llm-client/groq/`

**Responsibilities**:

- Groq LLM API integration
- Prompt management
- Response processing

**Key Components**:

- `GroqService` - LLM client service
- `GroqModule` - Module configuration

#### 3. GroqQueueModule

**Location**: `apps/ai/src/groq-queue/`

**Responsibilities**:

- Queue processing for AI tasks
- Task scheduling
- Error handling

**Key Components**:

- `GroqQueueProcessor` - Queue processor
- `GroqQueueService` - Queue management

#### 4. VectorStoreModule

**Location**: `apps/ai/src/pdf-store/`

**Responsibilities**:

- Vector database operations
- Document embedding
- Similarity search

**Key Components**:

- `VectorStoreService` - Vector store operations
- `VStoreModule` - Module configuration

### Message Queue Handlers

#### Chat Queue Handler

**Queue**: `chat_queue`

**Purpose**: Process AI chat requests

**Message Format**:

```typescript
interface ChatMessage {
    message: string;
    context?: string;
    userId: string;
    sessionId: string;
}
```

**Processing Flow**:

1. Receive chat message
2. Process with LLM (Groq)
3. Format response
4. Send back to requester

#### CV Queue Handler

**Queue**: `cv_queue`

**Purpose**: Process CV analysis requests

**Message Format**:

```typescript
interface CVMessage {
    fileUrl: string;
    userId: string;
    jobId?: string;
    analysisType: 'extract' | 'score' | 'match';
}
```

**Processing Flow**:

1. Download CV file
2. Extract text content
3. Process with AI models
4. Store in vector database
5. Return analysis results

### External Integrations

#### Groq LLM API

- **Purpose**: Large language model processing
- **Endpoints**: Chat completion, text generation
- **Authentication**: API key-based

#### Pinecone Vector Database

- **Purpose**: Vector storage for embeddings
- **Operations**: Store, search, update vectors
- **Authentication**: API key-based

#### ChromaDB Vector Database

- **Purpose**: Local vector storage
- **Operations**: Document embedding, similarity search

### Configuration

**Environment Variables**:

```bash
# Groq API
GROQ_API_KEY=your-groq-api-key

# Pinecone
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=your-environment

# ChromaDB
CHROMA_DB_PATH=./chroma_db
```

---

## Bot Service

**Port**: 3000  
**Database**: PostgreSQL (TypeORM)  
**Primary Role**: WhatsApp Bot Interface

### Architecture Overview

The Bot Service handles WhatsApp Business API integration and provides conversational interfaces for job applications and CV processing.

### Key Modules

#### 1. BotModule

**Location**: `apps/bot/src/`

**Responsibilities**:

- Bot orchestration
- Message routing
- Session management
- Business logic coordination

**Key Components**:

- `BotController` - HTTP endpoints
- `BotService` - Bot orchestration logic
- `BotModule` - Module configuration

#### 2. WhatsAppModule

**Location**: `apps/bot/src/whatsapp/`

**Responsibilities**:

- WhatsApp Business API integration
- Message sending/receiving
- Media handling
- Webhook processing

**Key Components**:

- `WhatsAppService` - WhatsApp API client
- Webhook handlers

**Endpoints**:

- `POST /webhook` - WhatsApp webhook
- `GET /webhook` - Webhook verification

#### 3. SessionStoreModule

**Location**: `apps/bot/src/session-store/`

**Responsibilities**:

- User session management
- Conversation state tracking
- Context preservation
- Session cleanup

**Key Components**:

- `SessionStoreService` - Session management
- Session data structures

#### 4. MessageDispatcherModule

**Location**: `apps/bot/src/message-dispatcher/`

**Responsibilities**:

- Message routing
- Intent recognition
- Response generation
- Flow management

**Key Components**:

- `MessageDispatcherService` - Message routing logic

#### 5. LogicModule

**Location**: `apps/bot/src/logic/`

**Responsibilities**:

- Business logic implementation
- Dialog management
- AI service coordination
- Job service integration

**Key Components**:

- `OrchestrationService` - Business logic orchestration
- `AiService` - AI service integration
- `JobService` - Job service integration

### Database Entities

#### Core Entities

- `User` - User information
- `Job` - Job postings
- `Applicant` - Job applicants
- `Analysis` - CV analysis results
- `InterviewerApplicantAssignment` - Interview assignments
- `TimeSlotMaster` - Available time slots
- `TimeSlotDetail` - Booked time slots

### Message Flow

#### CV Upload Flow

1. User sends CV via WhatsApp
2. Bot receives file and stores metadata
3. Bot sends message to `cv_queue`
4. AI Service processes CV
5. Results stored in database
6. Bot sends confirmation to user

#### Interview Scheduling Flow

1. User requests interview scheduling
2. Bot shows available time slots
3. User selects preferred time
4. Bot creates calendar event
5. Confirmation sent to user

### Configuration

**Environment Variables**:

```bash
# WhatsApp Business API
WHATSAPP_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id

# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://localhost:6379

# Message Queue
RABBITMQ_URL=amqp://admin:admin@localhost:5672/
```

---

## Common Library

**Location**: `libs/common/`  
**Primary Role**: Shared utilities and configurations

### Components

#### 1. RMQ Module

**Location**: `libs/common/src/rmq/`

**Responsibilities**:

- RabbitMQ configuration
- Message queue utilities
- Connection management

**Key Components**:

- `RmqService` - RabbitMQ service
- `RmqModule` - Module configuration

#### 2. Shared Utilities

**Location**: `libs/common/src/`

**Responsibilities**:

- Common interfaces
- Shared DTOs
- Utility functions
- Type definitions

### Usage

The Common Library is imported by all services to ensure consistency in:

- Message queue configuration
- Shared data structures
- Common utilities
- Type definitions

---

## Service Communication

### Inter-Service Communication Patterns

#### 1. Synchronous Communication

- **HTTP/REST**: Direct API calls between services
- **Use Cases**: Real-time data fetching, immediate responses

#### 2. Asynchronous Communication

- **RabbitMQ**: Message queue for background processing
- **Use Cases**: CV processing, AI chat, long-running tasks

### Message Queue Topics

| Service | Produces     | Consumes     | Purpose                |
| ------- | ------------ | ------------ | ---------------------- |
| Core    | `chat_queue` | -            | AI chat requests       |
| Core    | `cv_queue`   | -            | CV processing requests |
| Bot     | `cv_queue`   | -            | CV upload processing   |
| AI      | -            | `chat_queue` | AI chat processing     |
| AI      | -            | `cv_queue`   | CV analysis processing |

### Error Handling

#### Queue Error Handling

- **Dead Letter Queues**: Failed messages are moved to DLQ
- **Retry Logic**: Automatic retry with exponential backoff
- **Error Logging**: Comprehensive error tracking

#### Service Error Handling

- **Global Exception Filters**: Consistent error responses
- **Validation Pipes**: Input validation and sanitization
- **Response Interceptors**: Standardized response format
