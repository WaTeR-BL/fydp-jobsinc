# Integration Guide

## Overview

Jobsinc integrates with multiple external services and APIs to provide comprehensive recruitment functionality. This document covers all integration points, configuration, and usage patterns.

## External Service Integrations

### WhatsApp Business API

**Service**: Bot Service  
**Purpose**: WhatsApp messaging and bot functionality

#### Configuration

**Environment Variables**:

```bash
WHATSAPP_TOKEN=your-whatsapp-business-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_VERIFY_TOKEN=your-webhook-verify-token
```

**Location**: `apps/bot/src/whatsapp/whatsapp.service.ts`

#### Integration Features

1. **Message Reception**

    - Webhook endpoint for incoming messages
    - Message parsing and routing
    - Media file handling (CV uploads)

2. **Message Sending**

    - Text message responses
    - Template messages
    - Media message sending
    - Interactive message buttons

3. **Webhook Management**
    - Webhook verification
    - Message status updates
    - Delivery confirmations

#### API Endpoints

```typescript
// Webhook url-verification
GET /webhook?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE

// Message reception
POST /webhook
```

#### Message Flow

```
WhatsApp → Webhook → Bot Service → Message Dispatcher → Logic Service → Response
```

#### Error Handling

- **Webhook Verification**: Retry mechanism for failed verifications
- **Message Sending**: Queue-based retry for failed messages
- **Rate Limiting**: Respect WhatsApp API rate limits
- **Error Logging**: Comprehensive error tracking

### Google Calendar API

**Service**: Core Service  
**Purpose**: Interview scheduling and calendar management

#### Configuration

**Environment Variables**:

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3333/google-calender/callback
```

**Location**: `apps/core/src/google-calender/google-calendar.service.ts`

#### Integration Features

1. **OAuth2 Authentication**

    - User authorization flow
    - Token management and refresh
    - Scope management

2. **Calendar Operations**

    - Create interview events
    - Update event details
    - Delete events
    - List available time slots

3. **Event Management**
    - Interview scheduling
    - Attendee management
    - Reminder settings
    - Video conference links

#### API Endpoints

```typescript
// OAuth flow
GET / google - calender / auth;

// OAuth callback
POST / google - calender / callback;

// Create event
POST / google - calender / event;

// List events
GET / google - calender / events;
```

#### OAuth Flow

```
1. User requests calendar access
2. Redirect to Google OAuth
3. User authorizes application
4. Google redirects with code
5. Exchange code for tokens
6. Store tokens securely
```

#### Calendar Event Structure

```typescript
interface CalendarEvent {
    summary: string;
    description: string;
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    attendees: Array<{
        email: string;
        name: string;
    }>;
    conferenceData?: {
        createRequest: {
            requestId: string;
            conferenceSolutionKey: {
                type: string;
            };
        };
    };
}
```

### Groq LLM API

**Service**: AI Service  
**Purpose**: Large language model processing for CV analysis and AI chat

#### Configuration

**Environment Variables**:

```bash
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama3-8b-8192
```

**Location**: `apps/ai/src/llm-client/groq/groq.service.ts`

#### Integration Features

1. **Chat Completion**

    - AI-powered chat responses
    - Context-aware conversations
    - Multi-turn dialogue

2. **CV Analysis**

    - Document text extraction
    - Skill identification
    - Experience analysis
    - Job matching scoring

3. **Prompt Engineering**
    - Structured prompts for specific tasks
    - Context injection
    - Response formatting

#### API Usage

```typescript
// Chat completion
const response = await groqService.chat({
    messages: [{ role: 'user', content: 'Analyze this CV' }],
    model: 'llama3-8b-8192',
    temperature: 0.7,
});

// CV analysis
const analysis = await groqService.analyzeCV({
    content: cvText,
    jobRequirements: requirements,
    analysisType: 'extract',
});
```

#### Prompt Templates

**CV Extraction Prompt**:

```typescript
const cvExtractionPrompt = `
Analyze the following CV and extract:
1. Personal Information (name, email, phone)
2. Work Experience
3. Education
4. Skills
5. Certifications

CV Content: {cvContent}
`;
```

**Job Matching Prompt**:

```typescript
const jobMatchingPrompt = `
Compare the candidate's profile with job requirements:

Candidate Skills: {candidateSkills}
Job Requirements: {jobRequirements}

Provide a matching score (0-100) and detailed analysis.
`;
```

### Pinecone Vector Database

**Service**: AI Service  
**Purpose**: Vector storage for document embeddings and similarity search

#### Configuration

**Environment Variables**:

```bash
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-environment
PINECONE_INDEX_NAME=cv-embeddings
```

**Location**: `apps/ai/src/pdf-store/vstore.service.ts`

#### Integration Features

1. **Vector Storage**

    - Document embedding storage
    - Metadata management
    - Index optimization

2. **Similarity Search**

    - CV-to-job matching
    - Skill-based search
    - Semantic similarity

3. **Index Management**
    - Index creation and updates
    - Vector updates and deletions
    - Performance optimization

#### API Usage

```typescript
// Store embedding
await pineconeService.upsert({
    vectors: [
        {
            id: 'cv_123',
            values: embeddingVector,
            metadata: {
                documentType: 'cv',
                userId: 'user_123',
                skills: ['JavaScript', 'React'],
            },
        },
    ],
});

// Similarity search
const results = await pineconeService.query({
    vector: queryVector,
    topK: 10,
    includeMetadata: true,
    filter: {
        documentType: 'cv',
    },
});
```

### ChromaDB Vector Database

**Service**: AI Service  
**Purpose**: Local vector storage for development and testing

#### Configuration

**Environment Variables**:

```bash
CHROMA_DB_PATH=./chroma_db
CHROMA_COLLECTION_NAME=documents
```

**Location**: `apps/ai/src/pdf-store/vstore.service.ts`

#### Integration Features

1. **Local Vector Storage**

    - Document embeddings
    - Metadata storage
    - Similarity search

2. **Development Support**
    - Offline development
    - Testing environments
    - Data isolation

#### API Usage

```typescript
// Initialize collection
const collection = await chromaService.createCollection({
    name: 'documents',
    metadata: { description: 'CV documents' },
});

// Add documents
await collection.add({
    ids: ['doc_1'],
    embeddings: [embeddingVector],
    metadatas: [{ type: 'cv', userId: 'user_123' }],
});

// Query documents
const results = await collection.query({
    queryEmbeddings: [queryVector],
    nResults: 10,
});
```

---

## Message Queue Integration

### RabbitMQ Configuration

**Service**: All Services  
**Purpose**: Inter-service communication and task processing

#### Configuration

**Environment Variables**:

```bash
RABBITMQ_URL=amqp://admin:admin@localhost:5672/
RABBITMQ_USERNAME=admin
RABBITMQ_PASSWORD=admin
```

**Location**: `libs/common/src/rmq/rmq.service.ts`

#### Queue Configuration

```typescript
export class RmqService {
    getOptions(queue: string, noAck = true): RmqOptions {
        return {
            transport: Transport.RMQ,
            options: {
                urls: [`amqp://admin:admin@localhost:5672/`],
                queue: queue,
                noAck,
                queueOptions: {
                    durable: true,
                },
            },
        };
    }
}
```

#### Message Queues

| Queue Name   | Purpose            | Producers                 | Consumers  |
| ------------ | ------------------ | ------------------------- | ---------- |
| `chat_queue` | AI chat processing | Core Service              | AI Service |
| `cv_queue`   | CV analysis        | Bot Service, Core Service | AI Service |

#### Message Patterns

1. **Request-Response Pattern**

    ```typescript
    // Producer
    const response = await this.client.send('chat_queue', {
      message: 'Hello AI',
      userId: 'user_123'
    }).toPromise();

    // Consumer
    @MessagePattern('chat_queue')
    async handleChat(data: ChatMessage) {
      const response = await this.aiService.processChat(data);
      return response;
    }
    ```

2. **Fire-and-Forget Pattern**

    ```typescript
    // Producer
    this.client.emit('cv_queue', {
      fileUrl: 'https://example.com/cv.pdf',
      userId: 'user_123'
    });

    // Consumer
    @EventPattern('cv_queue')
    async handleCV(data: CVMessage) {
      await this.aiService.processCV(data);
    }
    ```

#### Error Handling

- **Dead Letter Queues**: Failed messages moved to DLQ
- **Retry Logic**: Exponential backoff retry
- **Message Persistence**: Durable queues for reliability
- **Acknowledgment**: Manual acknowledgment for critical messages

---

## Redis Integration

### Redis Configuration

**Service**: Bot Service  
**Purpose**: Session storage and caching

#### Configuration

**Environment Variables**:

```bash
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

**Location**: `apps/bot/src/redis/redis.service.ts`

#### Integration Features

1. **Session Storage**

    - User session management
    - Conversation state tracking
    - Temporary data storage

2. **Caching**

    - Frequently accessed data
    - API response caching
    - Rate limiting

3. **Pub/Sub**
    - Real-time notifications
    - Event broadcasting
    - Service coordination

#### Usage Patterns

```typescript
// Session storage
await redisService.set(`session:${userId}`, sessionData, 3600);

// Session retrieval
const session = await redisService.get(`session:${userId}`);

// Cache management
await redisService.setex(`cache:${key}`, 300, data);

// Pub/Sub
await redisService.publish('notifications', message);
await redisService.subscribe('notifications', callback);
```

---

## File Storage Integration

### Local File Storage

**Service**: Core Service, Bot Service  
**Purpose**: File upload and management

#### Configuration

**Location**: `apps/core/src/media-manager/media-manager.service.ts`

#### Features

1. **File Upload**

    - CV document uploads
    - Profile picture uploads
    - Document management

2. **File Processing**

    - File validation
    - Format conversion
    - Metadata extraction

3. **Storage Management**
    - File organization
    - Cleanup procedures
    - Access control

#### File Types

| File Type    | Extensions        | Max Size | Purpose              |
| ------------ | ----------------- | -------- | -------------------- |
| CV Documents | .pdf, .doc, .docx | 10MB     | Resume uploads       |
| Images       | .jpg, .png, .gif  | 5MB      | Profile pictures     |
| Videos       | .mp4, .avi        | 50MB     | Interview recordings |

#### API Endpoints

```typescript
// File upload
POST /media/upload
Content-Type: multipart/form-data

// File retrieval
GET /media/:fileId

// File deletion
DELETE /media/:fileId
```

---

## Authentication Integration

### JWT Token Management

**Service**: Core Service  
**Purpose**: API authentication and authorization

#### Configuration

**Environment Variables**:

```bash
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

**Location**: `apps/core/src/auth/auth.service.ts`

#### Token Strategy

1. **Access Token**

    - Short-lived (15 minutes)
    - API access authorization
    - User context information

2. **Refresh Token**
    - Long-lived (7 days)
    - Token renewal
    - Secure storage

#### Implementation

```typescript
// Token generation
const accessToken = this.jwtService.sign(payload, {
    secret: this.configService.get('JWT_SECRET'),
    expiresIn: '15m',
});

const refreshToken = this.jwtService.sign(payload, {
    secret: this.configService.get('JWT_REFRESH_SECRET'),
    expiresIn: '7d',
});

// Token validation
const payload = this.jwtService.verify(token, {
    secret: this.configService.get('JWT_SECRET'),
});
```

---

## Monitoring and Observability

### Logging Integration

**Service**: All Services  
**Purpose**: Application monitoring and debugging

#### Configuration

**Environment Variables**:

```bash
LOG_LEVEL=info
LOG_FORMAT=json
```

**Location**: All services using Pino logger

#### Logging Features

1. **Structured Logging**

    - JSON format logs
    - Contextual information
    - Correlation IDs

2. **Log Levels**

    - Error: Application errors
    - Warn: Warning conditions
    - Info: General information
    - Debug: Debug information

3. **Performance Monitoring**
    - Request/response logging
    - Database query logging
    - External API call logging

#### Usage

```typescript
// Service logging
this.logger.info('User logged in', { userId, email });

// Error logging
this.logger.error('Database connection failed', { error: error.message });

// Performance logging
this.logger.info('API request completed', {
    duration: Date.now() - startTime,
    endpoint: '/api/users',
});
```

### Health Checks

**Service**: All Services  
**Purpose**: Service health monitoring

#### Health Check Endpoints

```typescript
// Core Service
GET / health;

// Bot Service
GET / health;

// AI Service (via message queue)
// Health check through queue monitoring
```

#### Health Check Response

```json
{
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "services": {
        "database": "healthy",
        "redis": "healthy",
        "rabbitmq": "healthy"
    },
    "uptime": 3600
}
```

---

## Security Considerations

### API Security

1. **Rate Limiting**

    - Request throttling
    - IP-based limits
    - User-based limits

2. **Input Validation**

    - Request sanitization
    - SQL injection prevention
    - XSS protection

3. **Authentication**
    - JWT token validation
    - Role-based access control
    - Multi-factor authentication

### Data Security

1. **Encryption**

    - Data at rest encryption
    - Data in transit encryption
    - Sensitive data masking

2. **Access Control**

    - Principle of least privilege
    - API key management
    - Audit logging

3. **Compliance**
    - GDPR compliance
    - Data retention policies
    - Privacy protection

---

## Error Handling and Resilience

### Circuit Breaker Pattern

**Implementation**: External API calls

```typescript
// Circuit breaker for external APIs
class CircuitBreaker {
    private failures = 0;
    private lastFailureTime = 0;
    private state = 'CLOSED';

    async execute(fn: () => Promise<any>) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > 60000) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
}
```

### Retry Logic

**Implementation**: Message queue processing

```typescript
// Exponential backoff retry
async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000,
): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;

            const delay = baseDelay * Math.pow(2, i);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}
```

### Fallback Mechanisms

1. **Service Degradation**

    - Graceful degradation when external services fail
    - Cached responses for critical functionality
    - Queue-based retry for failed operations

2. **Data Consistency**
    - Event sourcing for data consistency
    - Saga pattern for distributed transactions
    - Compensation actions for rollbacks
