import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
    DbType,
    ExtraFieldType,
    IntegrationExecutionStatus,
    RelationType,
} from '@app/common/enums/app.enums';

// ─── Connection ───────────────────────────────────────────────────────────────

export class ConnectionDto {
    @IsString()
    @IsOptional()
    host?: string;

    @IsNumber()
    @IsOptional()
    port?: number;

    @IsString()
    @IsNotEmpty()
    database: string;

    @IsString()
    @IsOptional()
    username?: string;

    @IsString()
    @IsOptional()
    password?: string;

    @IsString()
    @IsOptional()
    connectionString?: string;

    @IsBoolean()
    @IsOptional()
    ssl?: boolean;
}

// ─── Column Mapping ───────────────────────────────────────────────────────────

export class ColumnMappingDto {
    @IsString()
    @IsNotEmpty()
    sourceField: string;

    @IsString()
    @IsNotEmpty()
    targetColumn: string;

    @IsBoolean()
    @IsOptional()
    required?: boolean;

    @IsOptional()
    defaultValue?: any;
}

// ─── Extra Field Definition ───────────────────────────────────────────────────

export class ExtraFieldDefDto {
    @IsString()
    @IsNotEmpty()
    fieldKey: string;

    @IsString()
    @IsNotEmpty()
    label: string;

    @IsEnum(ExtraFieldType)
    fieldType: ExtraFieldType;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    options?: string[];

    @IsBoolean()
    @IsOptional()
    required?: boolean;

    @IsString()
    @IsNotEmpty()
    targetColumn: string;

    @IsString()
    @IsOptional()
    referenceTable?: string;

    @IsString()
    @IsOptional()
    referenceQuery?: string;

    @IsString()
    @IsOptional()
    referenceIdField?: string;

    @IsString()
    @IsOptional()
    referenceDisplayField?: string;
}

// ─── Relation Definition ──────────────────────────────────────────────────────

export class RelationDefDto {
    @IsEnum(RelationType)
    type: RelationType;

    // one-to-many
    @IsString()
    @IsOptional()
    childTable?: string;

    @IsString()
    @IsOptional()
    foreignKey?: string;

    @IsString()
    @IsOptional()
    sourceArrayField?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ColumnMappingDto)
    @IsOptional()
    childColumns?: ColumnMappingDto[];

    // many-to-many
    @IsString()
    @IsOptional()
    junctionTable?: string;

    @IsString()
    @IsOptional()
    junctionParentKey?: string;

    @IsString()
    @IsOptional()
    junctionChildKey?: string;

    @IsString()
    @IsOptional()
    relatedTable?: string;

    @IsString()
    @IsOptional()
    relatedPrimaryKey?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ColumnMappingDto)
    @IsOptional()
    relatedColumns?: ColumnMappingDto[];

    // reference data fields
    @IsString()
    @IsOptional()
    referenceTable?: string;

    @IsString()
    @IsOptional()
    referenceQuery?: string;

    @IsString()
    @IsOptional()
    referenceIdField?: string;

    @IsString()
    @IsOptional()
    referenceDisplayField?: string;

    @IsString()
    @IsOptional()
    childReferenceKey?: string;
}

// ─── Table Config ─────────────────────────────────────────────────────────────

export class TableConfigDto {
    @IsString()
    @IsNotEmpty()
    tableName: string;

    @IsBoolean()
    @IsOptional()
    isPrimary?: boolean;

    @IsString()
    @IsNotEmpty()
    primaryKey: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ColumnMappingDto)
    columns: ColumnMappingDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ExtraFieldDefDto)
    @IsOptional()
    extraFields?: ExtraFieldDefDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RelationDefDto)
    @IsOptional()
    relations?: RelationDefDto[];

    @IsString()
    @IsOptional()
    tableSchema?: string;
}

// ─── Upsert Config ────────────────────────────────────────────────────────────

export class UpsertIntegrationConfigDto {
    @IsEnum(DbType)
    dbType: DbType;

    @ValidateNested()
    @Type(() => ConnectionDto)
    connection: ConnectionDto;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TableConfigDto)
    tables: TableConfigDto[];
}

// ─── Test Connection ──────────────────────────────────────────────────────────

export class TestConnectionDto {
    @IsEnum(DbType)
    dbType: DbType;

    @ValidateNested()
    @Type(() => ConnectionDto)
    connection: ConnectionDto;
}

// ─── Toggle Active ────────────────────────────────────────────────────────────

export class ToggleActiveDto {
    @IsBoolean()
    isActive: boolean;
}

// ─── Get Executions Query ─────────────────────────────────────────────────────

export class GetExecutionsDto {
    @IsEnum(IntegrationExecutionStatus)
    @IsOptional()
    status?: IntegrationExecutionStatus;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    page?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    limit?: number;
}

// ─── Hire with extra data (used from applicant-interviewer) ───────────────────

export class HireCandidateDto {
    @IsObject()
    @IsOptional()
    extraData?: Record<string, any>;
}

// ─── Sync Reference Table ─────────────────────────────────────────────────────

export class SyncRefTableDto {
    @IsString()
    @IsNotEmpty()
    tableKey: string;
}
