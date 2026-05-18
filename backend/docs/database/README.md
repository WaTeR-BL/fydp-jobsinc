# Database Schema Documentation

## Overview

Jobsinc uses a multi-database architecture with MongoDB for the Core Service and PostgreSQL for the Bot Service. This document provides detailed information about all database schemas, relationships, and data models.

## Database Architecture

### Database Distribution

| Service      | Database   | ORM/ODM  | Purpose                             |
| ------------ | ---------- | -------- | ----------------------------------- |
| Core Service | MongoDB    | Mongoose | Flexible document storage           |
| Bot Service  | PostgreSQL | TypeORM  | Structured relational data          |
| AI Service   | Vector DBs | Native   | AI embeddings and similarity search |

### Connection Details

- **MongoDB**: `mongodb+srv://musharrafabdullah84:jQRRXeqkucn9Lgrq@jobsinc.isvw2hy.mongodb.net/`
- **PostgreSQL**: Local/Cloud instance with TypeORM
- **Redis**: Local instance for caching and sessions

---

## Core Service - MongoDB Schemas

### Base Model Schema

**Location**: `apps/core/src/schemas/base-model.schema.ts`

**Purpose**: Common fields for all MongoDB documents

```typescript
export class BaseModel {
    @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
    _id: mongoose.Types.ObjectId;

    @Prop({ default: Date.now })
    createdAt: Date;

    @Prop({ default: Date.now })
    updatedAt: Date;

    @Prop({ default: false })
    isDeleted: boolean;
}
```

### User Schema

**Location**: `apps/core/src/schemas/user.schema.ts`

**Collection**: `users`

**Purpose**: User authentication and profile management

```typescript
@Schema({
    timestamps: true,
    collection: 'users',
    _id: true,
})
export class User {
    @Prop()
    name?: string;

    @Prop({ required: true, unique: true })
    emailAddress: string;

    @Prop({ default: true })
    status: boolean;

    @Prop()
    password?: string;

    @Prop()
    avatarUrl?: string;

    @Prop()
    hashedRefreshToken?: string;

    @Prop({ required: true, enum: AuthProvider, type: Number })
    authProvider: AuthProvider;

    @Prop({ type: [Number], required: true, enum: UserRole })
    roles: UserRole[];

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: false,
    })
    tenantId?: mongoose.Types.ObjectId;
}
```

**Indexes**:

- `emailAddress` (unique)
- `tenantId` (for multi-tenancy)

**Relationships**:

- Belongs to `Tenant` (optional)

### Job Schema

**Location**: `apps/core/src/schemas/job.schema.ts`

**Collection**: `jobs`

**Purpose**: Job posting and management

```typescript
@Schema({ timestamps: true, collection: 'jobs', _id: true })
export class Job extends BaseModel {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true, enum: JobStatus, type: Number })
    jobStatus: JobStatus;

    @Prop()
    startDate?: Date;

    @Prop()
    endDate?: Date;

    @Prop({ required: true })
    filename: string;

    @Prop({ required: true })
    filepath: string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Domain',
        required: true,
    })
    domainId: mongoose.Types.ObjectId;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    })
    tenantId: mongoose.Types.ObjectId;

    @Prop({
        type: [MetricSchema],
        required: true,
        default: undefined,
        validate: [
            (arr: Metric[]) => Array.isArray(arr) && arr.length > 0,
            'metrics must not be empty',
        ],
    })
    metrics: Metric[];

    @Prop({ type: [CheckListSchema], default: undefined, required: false })
    checkLists?: CheckList[] | null;
}
```

**Indexes**:

- `tenantId` (for multi-tenancy)
- `domainId` (for domain filtering)
- `jobStatus` (for status filtering)

**Relationships**:

- Belongs to `Tenant`
- Belongs to `Domain`
- Has many `Metric`
- Has many `CheckList`

### Tenant Schema

**Location**: `apps/core/src/schemas/tenant.schema.ts`

**Collection**: `tenants`

**Purpose**: Multi-tenancy and organization management

```typescript
@Schema({ timestamps: true, collection: 'tenants', _id: true })
export class Tenant extends BaseModel {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true, unique: true })
    domain: string;

    @Prop({ default: true })
    status: boolean;

    @Prop()
    logoUrl?: string;

    @Prop()
    settings?: {
        timezone: string;
        currency: string;
        language: string;
    };
}
```

**Indexes**:

- `domain` (unique)
- `status` (for active tenant filtering)

### Subscription Schema

**Location**: `apps/core/src/schemas/subscription.schema.ts`

**Collection**: `subscriptions`

**Purpose**: Billing and subscription management

```typescript
@Schema({ timestamps: true, collection: 'subscriptions', _id: true })
export class Subscription extends BaseModel {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    })
    tenantId: mongoose.Types.ObjectId;

    @Prop({ required: true })
    plan: string;

    @Prop({ required: true })
    status: string;

    @Prop()
    currentPeriodStart?: Date;

    @Prop()
    currentPeriodEnd?: Date;

    @Prop()
    features?: {
        jobPostings: number;
        aiCredits: number;
        teamMembers: number;
    };

    @Prop()
    usage?: {
        jobPostingsUsed: number;
        aiCreditsUsed: number;
        teamMembersUsed: number;
    };
}
```

**Indexes**:

- `tenantId` (for tenant-specific subscriptions)
- `status` (for active subscription filtering)

**Relationships**:

- Belongs to `Tenant`

### Domain Schema

**Location**: `apps/core/src/schemas/domain.schema.ts`

**Collection**: `domains`

**Purpose**: Job domains and categories

```typescript
@Schema({ timestamps: true, collection: 'domains', _id: true })
export class Domain extends BaseModel {
    @Prop({ required: true })
    name: string;

    @Prop()
    description?: string;

    @Prop({ default: true })
    status: boolean;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    })
    tenantId: mongoose.Types.ObjectId;
}
```

**Indexes**:

- `tenantId` (for tenant-specific domains)
- `status` (for active domain filtering)

**Relationships**:

- Belongs to `Tenant`

### Metric Schema

**Location**: `apps/core/src/schemas/metric.schema.ts`

**Collection**: Embedded in Job documents

**Purpose**: Job evaluation metrics

```typescript
@Schema({ _id: false })
export class Metric {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    value: number;

    @Prop()
    weight?: number;

    @Prop()
    description?: string;
}
```

### CheckList Schema

**Location**: `apps/core/src/schemas/checklist.schema.ts`

**Collection**: Embedded in Job documents

**Purpose**: Job requirements checklist

```typescript
@Schema({ _id: false })
export class CheckList {
    @Prop({ required: true })
    title: string;

    @Prop()
    description?: string;

    @Prop({ default: false })
    isCompleted: boolean;

    @Prop()
    completedBy?: string;

    @Prop()
    completedAt?: Date;
}
```

---

## Bot Service - PostgreSQL Entities

### Applicant Entity

**Location**: `apps/bot/src/entities/entities/Applicant.ts`

**Table**: `Applicant`

**Purpose**: Job applicant information and tracking

```sql
CREATE TABLE "Applicant" (
    "Id" SERIAL PRIMARY KEY,
    "fullname" TEXT,
    "contactNo" TEXT,
    "email" TEXT,
    "filename" TEXT,
    "filepath" TEXT,
    "applicantType" INTEGER,
    "isAccepted" BOOLEAN,
    "status" BOOLEAN,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "createdOn" TIMESTAMP WITH TIME ZONE NOT NULL,
    "UpdatedOn" TIMESTAMP WITH TIME ZONE,
    "InterviewerAssigned" BOOLEAN,
    "jobId" INTEGER,
    "progress" INTEGER,
    "videopath" TEXT
);
```

**Indexes**:

- `PK_Applicant` (Primary Key on `Id`)
- `IX_Applicant_jobId` (Foreign Key on `jobId`)

**Relationships**:

- Many-to-One with `Job`
- One-to-Many with `InterviewerApplicantAssignment`
- One-to-Many with `TimeSlotMaster`
- One-to-Many with `UserJobFeedback`

### Job Entity

**Location**: `apps/bot/src/entities/entities/Job.ts`

**Table**: `Job`

**Purpose**: Job postings in Bot Service

```sql
CREATE TABLE "Job" (
    "Id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requirements" TEXT,
    "location" TEXT,
    "salaryRange" TEXT,
    "employmentType" TEXT,
    "department" TEXT,
    "status" BOOLEAN DEFAULT true,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "createdOn" TIMESTAMP WITH TIME ZONE NOT NULL,
    "UpdatedOn" TIMESTAMP WITH TIME ZONE
);
```

**Relationships**:

- One-to-Many with `Applicant`

### InterviewerApplicantAssignment Entity

**Location**: `apps/bot/src/entities/entities/InterviewerApplicantAssignment.ts`

**Table**: `InterviewerApplicantAssignment`

**Purpose**: Interview scheduling and assignment

```sql
CREATE TABLE "InterviewerApplicantAssignment" (
    "Id" SERIAL PRIMARY KEY,
    "interviewerId" INTEGER,
    "applicantId" INTEGER,
    "jobId" INTEGER,
    "scheduledDate" TIMESTAMP WITH TIME ZONE,
    "status" TEXT,
    "notes" TEXT,
    "createdOn" TIMESTAMP WITH TIME ZONE NOT NULL,
    "UpdatedOn" TIMESTAMP WITH TIME ZONE
);
```

**Relationships**:

- Many-to-One with `Applicant`
- Many-to-One with `Job`

### TimeSlotMaster Entity

**Location**: `apps/bot/src/entities/entities/TimeSlotMaster.ts`

**Table**: `TimeSlotMaster`

**Purpose**: Available interview time slots

```sql
CREATE TABLE "TimeSlotMaster" (
    "Id" SERIAL PRIMARY KEY,
    "applicantId" INTEGER,
    "startTime" TIMESTAMP WITH TIME ZONE,
    "endTime" TIMESTAMP WITH TIME ZONE,
    "isBooked" BOOLEAN DEFAULT false,
    "createdOn" TIMESTAMP WITH TIME ZONE NOT NULL
);
```

**Relationships**:

- Many-to-One with `Applicant`

### TimeSlotDetail Entity

**Location**: `apps/bot/src/entities/entities/TimeSlotDetail.ts`

**Table**: `TimeSlotDetail`

**Purpose**: Booked interview time slots

```sql
CREATE TABLE "TimeSlotDetail" (
    "Id" SERIAL PRIMARY KEY,
    "timeSlotMasterId" INTEGER,
    "interviewerId" INTEGER,
    "applicantId" INTEGER,
    "startTime" TIMESTAMP WITH TIME ZONE,
    "endTime" TIMESTAMP WITH TIME ZONE,
    "status" TEXT,
    "createdOn" TIMESTAMP WITH TIME ZONE NOT NULL
);
```

**Relationships**:

- Many-to-One with `TimeSlotMaster`
- Many-to-One with `Applicant`

### UserJobFeedback Entity

**Location**: `apps/bot/src/entities/entities/UserJobFeedback.ts`

**Table**: `UserJobFeedback`

**Purpose**: Interview feedback and ratings

```sql
CREATE TABLE "UserJobFeedback" (
    "Id" SERIAL PRIMARY KEY,
    "applicantId" INTEGER,
    "interviewerId" INTEGER,
    "jobId" INTEGER,
    "rating" INTEGER,
    "feedback" TEXT,
    "recommendation" TEXT,
    "createdOn" TIMESTAMP WITH TIME ZONE NOT NULL
);
```

**Relationships**:

- Many-to-One with `Applicant`
- Many-to-One with `Job`

### Analysis Entity

**Location**: `apps/bot/src/entities/entities/Analysis.ts`

**Table**: `Analysis`

**Purpose**: CV analysis results

```sql
CREATE TABLE "Analysis" (
    "Id" SERIAL PRIMARY KEY,
    "applicantId" INTEGER,
    "jobId" INTEGER,
    "analysisType" TEXT,
    "score" DECIMAL,
    "details" JSONB,
    "createdOn" TIMESTAMP WITH TIME ZONE NOT NULL
);
```

**Relationships**:

- Many-to-One with `Applicant`
- Many-to-One with `Job`

---

## Vector Databases

### Pinecone Vector Database

**Purpose**: Cloud-based vector storage for AI embeddings

**Collections**:

- `cv-embeddings`: CV document embeddings
- `job-embeddings`: Job posting embeddings
- `skill-embeddings`: Skill-based embeddings

**Operations**:

- Store document embeddings
- Similarity search
- Vector updates and deletions

### ChromaDB Vector Database

**Purpose**: Local vector storage for development and testing

**Collections**:

- `documents`: Document embeddings
- `metadata`: Document metadata

**Operations**:

- Local similarity search
- Document retrieval
- Embedding management

---

## Data Relationships

### Core Service Relationships

```
Tenant (1) ←→ (N) User
Tenant (1) ←→ (N) Job
Tenant (1) ←→ (N) Domain
Tenant (1) ←→ (1) Subscription
Domain (1) ←→ (N) Job
Job (1) ←→ (N) Metric (Embedded)
Job (1) ←→ (N) CheckList (Embedded)
```

### Bot Service Relationships

```
Job (1) ←→ (N) Applicant
Applicant (1) ←→ (N) InterviewerApplicantAssignment
Applicant (1) ←→ (N) TimeSlotMaster
Applicant (1) ←→ (N) UserJobFeedback
Applicant (1) ←→ (N) Analysis
TimeSlotMaster (1) ←→ (N) TimeSlotDetail
```

### Cross-Service Relationships

- **Job IDs**: Shared between Core and Bot services
- **User IDs**: Shared between Core and Bot services
- **Tenant IDs**: Shared across all services

---

## Data Migration Strategy

### MongoDB Migrations

**Approach**: Application-level migrations using Mongoose

**Tools**:

- Mongoose schema versioning
- Custom migration scripts
- Data transformation utilities

### PostgreSQL Migrations

**Approach**: TypeORM migrations

**Tools**:

- TypeORM CLI
- Migration files
- Seed data scripts

### Migration Process

1. **Development**: Local migration testing
2. **Staging**: Migration validation
3. **Production**: Zero-downtime migrations
4. **Rollback**: Migration reversal procedures

---

## Data Backup and Recovery

### Backup Strategy

**MongoDB**:

- Automated daily backups
- Point-in-time recovery
- Cross-region replication

**PostgreSQL**:

- Automated daily backups
- WAL archiving
- Read replicas

**Vector Databases**:

- Embedding backups
- Metadata synchronization
- Index rebuilding procedures

### Recovery Procedures

1. **Database Recovery**: Restore from backups
2. **Data Consistency**: Cross-service validation
3. **Service Recovery**: Health check verification
4. **Data Integrity**: Validation and repair scripts

---

## Performance Optimization

### MongoDB Optimization

**Indexes**:

- Compound indexes for common queries
- Text indexes for search functionality
- TTL indexes for temporary data

**Query Optimization**:

- Aggregation pipeline optimization
- Projection for selective field retrieval
- Pagination with cursor-based queries

### PostgreSQL Optimization

**Indexes**:

- B-tree indexes for equality queries
- GiST indexes for spatial data
- Full-text search indexes

**Query Optimization**:

- Prepared statements
- Connection pooling
- Query plan analysis

### Vector Database Optimization

**Indexes**:

- HNSW indexes for similarity search
- IVF indexes for large datasets
- PQ indexes for compressed vectors

**Performance**:

- Batch operations
- Parallel processing
- Cache optimization
