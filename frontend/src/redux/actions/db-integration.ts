import { baseApi, ApiSuccessResponse } from '@/redux/api';

// ─── Enums ────────────────────────────────────────────────────────────────────

export type DbType = 'postgresql' | 'mysql' | 'mssql' | 'oracle' | 'mongodb';
export type ExtraFieldType = 'text' | 'number' | 'date' | 'select';
export type RelationType = 'one-to-many' | 'many-to-many';
export type ExecutionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

// ─── Config Types ─────────────────────────────────────────────────────────────

export interface ConnectionDto {
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  connectionString?: string;
  ssl?: boolean;
}

export interface ColumnMappingDto {
  sourceField: string;
  targetColumn: string;
  required?: boolean;
  defaultValue?: any;
}

export interface ExtraFieldDef {
  fieldKey: string;
  label: string;
  fieldType: ExtraFieldType;
  options?: string[];
  required?: boolean;
  targetColumn: string;
  /** If set, options are loaded dynamically from the reference data cache */
  referenceTable?: string;
  referenceQuery?: string;
  referenceIdField?: string;
  referenceDisplayField?: string;
}

export interface RelationColumnDef {
  sourceField: string;
  label: string;
  required: boolean;
}

export interface HireRelationDef {
  sourceArrayField: string;
  label: string;
  type: RelationType;
  hasReference: boolean;
  referenceTable: string | null;
  referenceIdField: string;
  referenceDisplayField: string;
  columns: RelationColumnDef[];
}

export interface HireSchema {
  extraFields: ExtraFieldDef[];
  relations: HireRelationDef[];
}

export interface RefTableMeta {
  tableKey: string;
  lastSyncedAt: string | null;
  isSynced: boolean;
}

export interface RefTableData {
  tableKey: string;
  data: Record<string, any>[];
  lastSyncedAt: string | null;
}

export interface RelationDefDto {
  type: RelationType;
  // one-to-many
  childTable?: string;
  foreignKey?: string;
  sourceArrayField?: string;
  childColumns?: ColumnMappingDto[];
  // many-to-many
  junctionTable?: string;
  junctionParentKey?: string;
  junctionChildKey?: string;
  relatedTable?: string;
  relatedPrimaryKey?: string;
  relatedColumns?: ColumnMappingDto[];
  // reference data (master table lookup)
  referenceTable?: string;
  referenceQuery?: string;
  referenceIdField?: string;
  referenceDisplayField?: string;
  childReferenceKey?: string;
}

export interface TableConfigDto {
  tableName: string;
  tableSchema?: string;
  isPrimary?: boolean;
  primaryKey: string;
  columns: ColumnMappingDto[];
  extraFields?: ExtraFieldDef[];
  relations?: RelationDefDto[];
}

export interface UpsertIntegrationConfigDto {
  dbType: DbType;
  connection: ConnectionDto;
  tables: TableConfigDto[];
}

export interface IntegrationConfig {
  _id: string;
  tenantId: string;
  isActive: boolean;
  dbType: DbType;
  tables: TableConfigDto[];
  createdAt: string;
  updatedAt: string;
}

// ─── Execution Types ──────────────────────────────────────────────────────────

export interface IntegrationExecution {
  _id: string;
  tenantId: string;
  configId: string;
  feedbackId: string;
  candidateSnapshot: Record<string, any>;
  extraDataSnapshot: Record<string, any>;
  status: ExecutionStatus;
  error: string | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedExecutions {
  items: IntegrationExecution[];
  total: number;
  page: number;
  limit: number;
}

// ─── RTK Query API ────────────────────────────────────────────────────────────

export const dbIntegrationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    upsertIntegrationConfig: builder.mutation<
      ApiSuccessResponse<IntegrationConfig>,
      UpsertIntegrationConfigDto
    >({
      query: (body) => ({ url: 'db-integration/config', method: 'POST', body }),
    }),

    getIntegrationConfig: builder.query<ApiSuccessResponse<IntegrationConfig>, void>({
      query: () => ({ url: 'db-integration/config', method: 'GET' }),
    }),

    getRequiredExtraFields: builder.query<ApiSuccessResponse<ExtraFieldDef[]>, void>({
      query: () => ({ url: 'db-integration/config/required-fields', method: 'GET' }),
    }),

    getHireSchema: builder.query<ApiSuccessResponse<HireSchema>, void>({
      query: () => ({ url: 'db-integration/config/hire-schema', method: 'GET' }),
    }),

    toggleIntegrationActive: builder.mutation<ApiSuccessResponse<void>, boolean>({
      query: (isActive) => ({
        url: 'db-integration/config/toggle',
        method: 'PATCH',
        body: { isActive },
      }),
    }),

    testDbConnection: builder.mutation<
      ApiSuccessResponse<void>,
      { dbType: DbType; connection: ConnectionDto }
    >({
      query: (body) => ({ url: 'db-integration/config/test-connection', method: 'POST', body }),
    }),

    getExecutions: builder.query<
      ApiSuccessResponse<PaginatedExecutions>,
      { status?: ExecutionStatus; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: 'db-integration/executions',
        method: 'GET',
        params,
      }),
    }),

    getExecution: builder.query<ApiSuccessResponse<IntegrationExecution>, string>({
      query: (id) => ({ url: `db-integration/executions/${id}`, method: 'GET' }),
    }),

    retryExecution: builder.mutation<ApiSuccessResponse<void>, string>({
      query: (id) => ({ url: `db-integration/executions/${id}/retry`, method: 'POST' }),
    }),

    listRefTables: builder.query<ApiSuccessResponse<RefTableMeta[]>, void>({
      query: () => ({ url: 'db-integration/reference-data', method: 'GET' }),
    }),

    getRefData: builder.query<ApiSuccessResponse<Record<string, any>[]>, string>({
      query: (tableKey) => ({
        url: `db-integration/reference-data/${encodeURIComponent(tableKey)}`,
        method: 'GET',
      }),
    }),

    syncAllRefData: builder.mutation<ApiSuccessResponse<any>, void>({
      query: () => ({ url: 'db-integration/reference-data/sync', method: 'POST' }),
    }),

    syncRefTable: builder.mutation<ApiSuccessResponse<any>, string>({
      query: (tableKey) => ({
        url: `db-integration/reference-data/sync/${encodeURIComponent(tableKey)}`,
        method: 'POST',
      }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useUpsertIntegrationConfigMutation,
  useGetIntegrationConfigQuery,
  useLazyGetIntegrationConfigQuery,
  useGetRequiredExtraFieldsQuery,
  useLazyGetRequiredExtraFieldsQuery,
  useGetHireSchemaQuery,
  useLazyGetHireSchemaQuery,
  useToggleIntegrationActiveMutation,
  useTestDbConnectionMutation,
  useGetExecutionsQuery,
  useGetExecutionQuery,
  useRetryExecutionMutation,
  useListRefTablesQuery,
  useGetRefDataQuery,
  useLazyGetRefDataQuery,
  useSyncAllRefDataMutation,
  useSyncRefTableMutation,
} = dbIntegrationApi;
