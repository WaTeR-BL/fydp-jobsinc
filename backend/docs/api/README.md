# API Documentation

## Overview

Jobsinc provides RESTful APIs through the Core Service (Port: 3333) and Bot Service (Port: 3000). This document covers all available endpoints, authentication mechanisms, and data schemas.

## Base URLs

- **Core Service**: `http://localhost:3333`
- **Bot Service**: `http://localhost:3000`

## Authentication

### JWT Token Strategy

Jobsinc uses a dual-token authentication strategy:

- **Access Token**: Short-lived (15 minutes) for API access
- **Refresh Token**: Long-lived (7 days) for token renewal

### Authentication Flow

1. **Login**: User provides credentials → Receive access + refresh tokens
2. **API Access**: Include access token in Authorization header
3. **Token Refresh**: Use refresh token to get new access token
4. **Logout**: Invalidate both tokens

### Headers

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Core Service APIs

### Authentication Endpoints

#### POST /auth/login

**Description**: Authenticate user and receive tokens

**Request Body**:

```json
{
    "email": "user@example.com",
    "password": "password123"
}
```

**Response**:

```json
{
    "success": true,
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "user": {
            "id": "user_id",
            "email": "user@example.com",
            "name": "John Doe",
            "role": "recruiter"
        }
    }
}
```

#### POST /auth/refresh

**Description**: Refresh access token using refresh token

**Request Body**:

```json
{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response**:

```json
{
    "success": true,
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
}
```

#### POST /auth/logout

**Description**: Logout user and invalidate tokens

**Headers**: `Authorization: Bearer <access_token>`

**Response**:

```json
{
    "success": true,
    "message": "Logged out successfully"
}
```

### User Management Endpoints

#### GET /user/profile

**Description**: Get current user profile

**Headers**: `Authorization: Bearer <access_token>`

**Response**:

```json
{
    "success": true,
    "data": {
        "id": "user_id",
        "email": "user@example.com",
        "name": "John Doe",
        "phone": "+1234567890",
        "role": "recruiter",
        "tenant_id": "tenant_id",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
}
```

#### PUT /user/profile

**Description**: Update user profile

**Headers**: `Authorization: Bearer <access_token>`

**Request Body**:

```json
{
    "name": "John Doe Updated",
    "phone": "+1234567890",
    "preferences": {
        "notifications": true,
        "timezone": "UTC"
    }
}
```

**Response**:

```json
{
    "success": true,
    "data": {
        "id": "user_id",
        "name": "John Doe Updated",
        "phone": "+1234567890",
        "preferences": {
            "notifications": true,
            "timezone": "UTC"
        },
        "updated_at": "2024-01-01T00:00:00Z"
    }
}
```

### Job Management Endpoints

#### POST /job

**Description**: Create a new job posting

**Headers**: `Authorization: Bearer <access_token>`

**Request Body**:

```json
{
    "title": "Senior Software Engineer",
    "description": "We are looking for a senior software engineer...",
    "requirements": [
        "5+ years of experience",
        "JavaScript/TypeScript",
        "React/Vue.js"
    ],
    "location": "Remote",
    "salary_range": {
        "min": 80000,
        "max": 120000,
        "currency": "USD"
    },
    "employment_type": "full-time",
    "department": "Engineering",
    "skills": ["JavaScript", "React", "Node.js"],
    "experience_level": "senior"
}
```

**Response**:

```json
{
    "success": true,
    "data": {
        "id": "job_id",
        "title": "Senior Software Engineer",
        "description": "We are looking for a senior software engineer...",
        "requirements": ["5+ years of experience", "JavaScript/TypeScript"],
        "location": "Remote",
        "salary_range": {
            "min": 80000,
            "max": 120000,
            "currency": "USD"
        },
        "employment_type": "full-time",
        "department": "Engineering",
        "skills": ["JavaScript", "React", "Node.js"],
        "experience_level": "senior",
        "status": "active",
        "created_by": "user_id",
        "tenant_id": "tenant_id",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
}
```

#### GET /job

**Description**: List jobs with filtering and pagination

**Headers**: `Authorization: Bearer <access_token>`

**Query Parameters**:

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search in title and description
- `location` (string): Filter by location
- `employment_type` (string): Filter by employment type
- `department` (string): Filter by department
- `status` (string): Filter by status (active, inactive, draft)

**Response**:

```json
{
    "success": true,
    "data": {
        "items": [
            {
                "id": "job_id",
                "title": "Senior Software Engineer",
                "location": "Remote",
                "employment_type": "full-time",
                "department": "Engineering",
                "status": "active",
                "created_at": "2024-01-01T00:00:00Z"
            }
        ],
        "meta": {
            "page": 1,
            "limit": 10,
            "total": 25,
            "total_pages": 3
        }
    }
}
```

#### GET /job/:id

**Description**: Get job details by ID

**Headers**: `Authorization: Bearer <access_token>`

**Response**:

```json
{
    "success": true,
    "data": {
        "id": "job_id",
        "title": "Senior Software Engineer",
        "description": "We are looking for a senior software engineer...",
        "requirements": ["5+ years of experience", "JavaScript/TypeScript"],
        "location": "Remote",
        "salary_range": {
            "min": 80000,
            "max": 120000,
            "currency": "USD"
        },
        "employment_type": "full-time",
        "department": "Engineering",
        "skills": ["JavaScript", "React", "Node.js"],
        "experience_level": "senior",
        "status": "active",
        "applications_count": 15,
        "created_by": "user_id",
        "tenant_id": "tenant_id",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
}
```

#### PUT /job/:id

**Description**: Update job posting

**Headers**: `Authorization: Bearer <access_token>`

**Request Body**: Same as POST /job

**Response**:

```json
{
    "success": true,
    "data": {
        "id": "job_id",
        "title": "Updated Job Title",
        "updated_at": "2024-01-01T00:00:00Z"
    }
}
```

#### DELETE /job/:id

**Description**: Delete job posting

**Headers**: `Authorization: Bearer <access_token>`

**Response**:

```json
{
    "success": true,
    "message": "Job deleted successfully"
}
```

### Tenant Management Endpoints

#### GET /tenant

**Description**: Get current tenant information

**Headers**: `Authorization: Bearer <access_token>`

**Response**:

```json
{
    "success": true,
    "data": {
        "id": "tenant_id",
        "name": "Acme Corporation",
        "domain": "acme.com",
        "subscription": {
            "plan": "premium",
            "status": "active",
            "expires_at": "2024-12-31T23:59:59Z"
        },
        "settings": {
            "timezone": "UTC",
            "currency": "USD",
            "language": "en"
        },
        "created_at": "2024-01-01T00:00:00Z"
    }
}
```

#### PUT /tenant

**Description**: Update tenant settings

**Headers**: `Authorization: Bearer <access_token>`

**Request Body**:

```json
{
    "name": "Updated Company Name",
    "settings": {
        "timezone": "America/New_York",
        "currency": "EUR",
        "language": "es"
    }
}
```

### Subscription Management Endpoints

#### GET /subscription

**Description**: Get current subscription details

**Headers**: `Authorization: Bearer <access_token>`

**Response**:

```json
{
    "success": true,
    "data": {
        "id": "subscription_id",
        "plan": "premium",
        "status": "active",
        "current_period_start": "2024-01-01T00:00:00Z",
        "current_period_end": "2024-02-01T00:00:00Z",
        "features": {
            "job_postings": 100,
            "ai_credits": 1000,
            "team_members": 10
        },
        "usage": {
            "job_postings_used": 25,
            "ai_credits_used": 150,
            "team_members_used": 3
        }
    }
}
```

#### POST /subscription/upgrade

**Description**: Upgrade subscription plan

**Headers**: `Authorization: Bearer <access_token>`

**Request Body**:

```json
{
    "plan": "enterprise",
    "payment_method": "card_123456"
}
```

### Google Calendar Integration Endpoints

#### GET /google-calendar/auth

**Description**: Get Google Calendar authorization URL

**Headers**: `Authorization: Bearer <access_token>`

**Response**:

```json
{
    "success": true,
    "data": {
        "auth_url": "https://accounts.google.com/oauth/authorize?..."
    }
}
```

#### POST /google-calendar/callback

**Description**: Handle Google Calendar OAuth callback

**Request Body**:

```json
{
    "code": "authorization_code",
    "state": "state_parameter"
}
```

#### POST /google-calendar/event

**Description**: Create calendar event for interview

**Headers**: `Authorization: Bearer <access_token>`

**Request Body**:

```json
{
    "summary": "Interview with John Doe",
    "description": "Technical interview for Senior Software Engineer position",
    "start_time": "2024-01-15T10:00:00Z",
    "end_time": "2024-01-15T11:00:00Z",
    "attendees": [
        {
            "email": "interviewer@company.com",
            "name": "InterviewerSchema Name"
        },
        {
            "email": "candidate@email.com",
            "name": "John Doe"
        }
    ]
}
```

### Media Management Endpoints

#### POST /media/upload

**Description**: Upload file (CV, profile picture, etc.)

**Headers**: `Authorization: Bearer <access_token>`

**Request**: `multipart/form-data`

**Form Data**:

- `file`: File to upload
- `type`: File type (cv, profile, document)
- `metadata`: Additional metadata (JSON string)

**Response**:

```json
{
    "success": true,
    "data": {
        "id": "file_id",
        "filename": "resume.pdf",
        "url": "https://storage.example.com/files/resume.pdf",
        "size": 1024000,
        "type": "cv",
        "uploaded_at": "2024-01-01T00:00:00Z"
    }
}
```

## Bot Service APIs

### WhatsApp Integration Endpoints

#### GET /webhook

**Description**: WhatsApp webhook verification

**Query Parameters**:

- `hub.mode`: subscribe
- `hub.verify_token`: Your verification token
- `hub.challenge`: Challenge string

**Response**: Challenge string

#### POST /webhook

**Description**: Receive WhatsApp messages

**Request Body**:

```json
{
    "object": "whatsapp_business_account",
    "entry": [
        {
            "id": "phone_number_id",
            "changes": [
                {
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {
                            "display_phone_number": "1234567890",
                            "phone_number_id": "phone_number_id"
                        },
                        "contacts": [
                            {
                                "profile": {
                                    "name": "John Doe"
                                },
                                "wa_id": "wa_id"
                            }
                        ],
                        "messages": [
                            {
                                "from": "wa_id",
                                "id": "message_id",
                                "timestamp": "1234567890",
                                "text": {
                                    "body": "Hello"
                                },
                                "type": "text"
                            }
                        ]
                    },
                    "field": "messages"
                }
            ]
        }
    ]
}
```

**Response**: `200 OK`

### Bot Management Endpoints

#### GET /bot/status

**Description**: Get bot service status

**Response**:

```json
{
    "success": true,
    "data": {
        "status": "running",
        "uptime": 3600,
        "message_count": 150,
        "active_sessions": 25
    }
}
```

#### POST /bot/send-message

**Description**: Send message via WhatsApp

**Request Body**:

```json
{
    "to": "wa_id",
    "message": "Hello! How can I help you today?",
    "type": "text"
}
```

## Error Responses

### Standard Error Format

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": [
            {
                "field": "email",
                "message": "Email is required"
            }
        ]
    }
}
```

### Common Error Codes

| Code               | Description               | HTTP Status |
| ------------------ | ------------------------- | ----------- |
| `UNAUTHORIZED`     | Invalid or missing token  | 401         |
| `FORBIDDEN`        | Insufficient permissions  | 403         |
| `NOT_FOUND`        | Resource not found        | 404         |
| `VALIDATION_ERROR` | Request validation failed | 400         |
| `INTERNAL_ERROR`   | Server error              | 500         |
| `RATE_LIMITED`     | Too many requests         | 429         |

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute
- **API endpoints**: 100 requests per minute per user
- **File uploads**: 10 requests per minute per user

## Pagination

All list endpoints support pagination with the following parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

Response includes metadata:

```json
{
    "meta": {
        "page": 1,
        "limit": 10,
        "total": 150,
        "total_pages": 15,
        "has_next": true,
        "has_prev": false
    }
}
```

## Data Validation

All endpoints use class-validator for request validation:

- **Email**: Must be valid email format
- **Password**: Minimum 8 characters, alphanumeric
- **Phone**: International format (+1234567890)
- **File uploads**: Size and type restrictions
- **Dates**: ISO 8601 format

## Webhooks

### WhatsApp Webhook Events

- `messages`: Incoming messages
- `message_status`: Message delivery status
- `message_template_status`: Template message status

### Security

- Webhook signature verification
- Rate limiting on webhook endpoints
- IP whitelisting (recommended)
