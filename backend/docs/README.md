# Jobsinc - Technical Documentation

## Overview

Jobsinc is a microservices-based job recruitment platform built with NestJS. The system is designed as a monorepo with multiple specialized services handling different aspects of the recruitment process.

## Architecture

The platform follows a microservices architecture pattern with the following core services:

- **Core Service** - Main business logic and API gateway
- **AI Service** - AI/ML processing and LLM integration
- **Bot Service** - WhatsApp bot functionality
- **Common Library** - Shared utilities and configurations

## Documentation Structure

### 1. [Architecture Overview](./architecture/README.md)

- System architecture and design patterns
- Service communication patterns
- Technology stack and dependencies

### 2. [API Documentation](./api/README.md)

- REST API specifications
- Authentication and authorization
- Request/response schemas

### 3. [Service Documentation](./services/README.md)

- Individual service documentation
- Module structure and responsibilities
- Configuration and deployment

### 4. [Database Schema](./database/README.md)

- Data models and relationships
- Migration strategies
- Schema documentation

### 5. [Integration Guide](./integrations/README.md)

- External service integrations
- Message queue patterns
- Third-party API usage

### 6. [Development Guide](./development/README.md)

- Setup and installation
- Development workflow
- Testing strategies

## Quick Start

```bash
# Install dependencies
npm install

# Start development environment
npm run start:dev

# Build all services
npm run build
```

## Technology Stack

- **Framework**: NestJS (Node.js)
- **Database**: MongoDB (Mongoose), PostgreSQL (TypeORM)
- **Message Queue**: RabbitMQ
- **AI/ML**: Groq, LangChain, ChromaDB
- **Authentication**: JWT, Passport
- **External APIs**: WhatsApp Business API, Google Calendar API
- **Vector Database**: Pinecone, ChromaDB
- **Caching**: Redis

## Service Ports

- **Core Service**: 3333
- **Bot Service**: 3000
- **AI Service**: Microservice (no HTTP port)
- **RabbitMQ**: 5672
- **Redis**: 6379 (default)

## Repository Structure

```
jobsinc/
├── apps/
│   ├── core/          # Main business logic service
│   ├── ai/            # AI/ML processing service
│   └── bot/           # WhatsApp bot service
├── libs/
│   └── common/        # Shared utilities and configurations
└── docs/              # Documentation
```
