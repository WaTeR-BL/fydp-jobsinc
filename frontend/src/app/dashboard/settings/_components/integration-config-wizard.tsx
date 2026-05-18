'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  useUpsertIntegrationConfigMutation,
  useTestDbConnectionMutation,
  type DbType,
  type ConnectionDto,
  type ColumnMappingDto,
  type ExtraFieldDef,
  type RelationDefDto,
  type RelationType,
  type TableConfigDto,
  type UpsertIntegrationConfigDto,
} from '@/redux/actions/db-integration';

// ─── Constants ────────────────────────────────────────────────────────────────

const DB_TYPES: { value: DbType; label: string }[] = [
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'mssql', label: 'SQL Server (MSSQL)' },
  { value: 'oracle', label: 'Oracle' },
  { value: 'mongodb', label: 'MongoDB' },
];

const CANDIDATE_FIELDS = [
  { value: 'fullName', label: 'Full Name' },
  { value: 'email', label: 'Email' },
  { value: 'contact', label: 'Contact / Phone' },
  { value: 'timezone', label: 'Timezone' },
  { value: 'cvUrl', label: 'CV URL' },
  { value: 'cvMatch', label: 'CV Match Score' },
  { value: 'feedback', label: 'CV Feedback' },
  { value: 'applicantId', label: 'Applicant ID' },
  { value: 'feedbackId', label: 'Feedback ID' },
  { value: 'tenantId', label: 'Tenant ID' },
  { value: 'jobId', label: 'Job ID' },
  { value: 'jobTitle', label: 'Job Title' },
];

const EXTRA_FIELD_TYPES: { value: ExtraFieldDef['fieldType']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select (Dropdown)' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyColumn = (): ColumnMappingDto => ({
  sourceField: '',
  targetColumn: '',
  required: false,
});

const emptyExtraField = (): ExtraFieldDef => ({
  fieldKey: '',
  label: '',
  fieldType: 'text',
  options: [],
  required: false,
  targetColumn: '',
});

const emptyRelation = (): RelationDefDto => ({
  type: 'one-to-many',
  sourceArrayField: '',
  childTable: '',
  foreignKey: '',
  childColumns: [],
});

const emptyTable = (): TableConfigDto => ({
  tableName: '',
  tableSchema: '',
  isPrimary: false,
  primaryKey: 'id',
  columns: [emptyColumn()],
  extraFields: [],
  relations: [],
});

// ─── Step 1: DB Type ──────────────────────────────────────────────────────────

const StepDbType = ({ dbType, onChange }: { dbType: DbType; onChange: (v: DbType) => void }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-base font-semibold mb-1">Select Database Type</h3>
      <p className="text-sm text-muted-foreground">
        Choose the type of external database you want to sync hired candidates into.
      </p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {DB_TYPES.map((db) => (
        <button
          key={db.value}
          type="button"
          onClick={() => onChange(db.value)}
          className={`rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-colors ${
            dbType === db.value
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border hover:border-muted-foreground/40'
          }`}
        >
          {db.label}
        </button>
      ))}
    </div>
  </div>
);

// ─── Step 2: Connection ───────────────────────────────────────────────────────

const StepConnection = ({
  dbType,
  connection,
  onChange,
  onTest,
  isTesting,
}: {
  dbType: DbType;
  connection: ConnectionDto;
  onChange: (v: ConnectionDto) => void;
  onTest: () => void;
  isTesting: boolean;
}) => {
  const isMongo = dbType === 'mongodb';
  const set = (key: keyof ConnectionDto, val: any) => onChange({ ...connection, [key]: val });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold mb-1">Connection Details</h3>
        <p className="text-sm text-muted-foreground">
          These credentials are encrypted before storage and never exposed in API responses.
        </p>
      </div>
      <div className="space-y-3">
        {isMongo ? (
          <div className="space-y-1">
            <Label>Connection String</Label>
            <Input
              placeholder="mongodb://user:pass@host:27017/dbname"
              value={connection.connectionString ?? ''}
              onChange={(e) => set('connectionString', e.target.value)}
            />
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <Label>
                Connection String{' '}
                <span className="text-muted-foreground font-normal text-xs">
                  (optional — overrides fields below)
                </span>
              </Label>
              <Input
                placeholder="postgresql://user:pass@host:5432/dbname?sslmode=require"
                value={connection.connectionString ?? ''}
                onChange={(e) => set('connectionString', e.target.value || undefined)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Host</Label>
                <Input
                  placeholder="db.example.com"
                  value={connection.host ?? ''}
                  onChange={(e) => set('host', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Port</Label>
                <Input
                  type="number"
                  placeholder={
                    dbType === 'postgresql'
                      ? '5432'
                      : dbType === 'mysql'
                        ? '3306'
                        : dbType === 'mssql'
                          ? '1433'
                          : '1521'
                  }
                  value={connection.port ?? ''}
                  onChange={(e) => set('port', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Database Name</Label>
              <Input
                placeholder="mydb"
                value={connection.database ?? ''}
                onChange={(e) => set('database', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Username</Label>
                <Input
                  value={connection.username ?? ''}
                  onChange={(e) => set('username', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={connection.password ?? ''}
                  onChange={(e) => set('password', e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={connection.ssl ?? false} onCheckedChange={(v) => set('ssl', v)} />
              <Label className="text-sm">Enable SSL</Label>
            </div>
          </>
        )}
        <Button variant="outline" size="sm" onClick={onTest} disabled={isTesting}>
          {isTesting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
          Test Connection
        </Button>
      </div>
    </div>
  );
};

// ─── Relation Editor ──────────────────────────────────────────────────────────

const RelationEditor = ({
  relation,
  index,
  onChange,
  onRemove,
}: {
  relation: RelationDefDto;
  index: number;
  onChange: (r: RelationDefDto) => void;
  onRemove: () => void;
}) => {
  const set = (key: keyof RelationDefDto, val: any) => onChange({ ...relation, [key]: val });
  const isO2M = relation.type === 'one-to-many';
  const isM2M = relation.type === 'many-to-many';
  const hasRef = !!relation.referenceTable;

  const setChildColumn = (i: number, col: ColumnMappingDto) => {
    const cols = [...(relation.childColumns ?? [])];
    cols[i] = col;
    set('childColumns', cols);
  };
  const removeChildColumn = (i: number) =>
    set('childColumns', relation.childColumns?.filter((_, idx) => idx !== i) ?? []);

  return (
    <div className="rounded border p-3 space-y-3 bg-muted/20">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Relation #{index + 1}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Type + source array field */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={relation.type} onValueChange={(v) => set('type', v as RelationType)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one-to-many" className="text-xs">
                One-to-Many (O2M)
              </SelectItem>
              <SelectItem value="many-to-many" className="text-xs">
                Many-to-Many (M2M)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            Source Array Field <span className="text-muted-foreground">(key in extraData)</span>
          </Label>
          <Input
            placeholder="skills"
            value={relation.sourceArrayField ?? ''}
            onChange={(e) => set('sourceArrayField', e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      </div>

      {/* Reference table toggle */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={hasRef}
            onCheckedChange={(v) => {
              if (!v)
                onChange({
                  ...relation,
                  referenceTable: undefined,
                  referenceQuery: undefined,
                  referenceIdField: undefined,
                  referenceDisplayField: undefined,
                  childReferenceKey: undefined,
                });
              else set('referenceTable', '');
            }}
            className="scale-75"
          />
          <Label className="text-xs">
            Reference Master Table{' '}
            <span className="text-muted-foreground">(options loaded from DB)</span>
          </Label>
        </div>

        {hasRef && (
          <div className="rounded border p-2 bg-muted/30 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Reference Table</Label>
                <Input
                  placeholder="skills"
                  value={relation.referenceTable ?? ''}
                  onChange={(e) => set('referenceTable', e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reference ID Field</Label>
                <Input
                  placeholder="id"
                  value={relation.referenceIdField ?? ''}
                  onChange={(e) => set('referenceIdField', e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reference Display Field</Label>
                <Input
                  placeholder="name"
                  value={relation.referenceDisplayField ?? ''}
                  onChange={(e) => set('referenceDisplayField', e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  Reference Query <span className="text-muted-foreground">(optional SQL)</span>
                </Label>
                <Input
                  placeholder="SELECT id, name FROM skills WHERE status = TRUE"
                  value={relation.referenceQuery ?? ''}
                  onChange={(e) => set('referenceQuery', e.target.value || undefined)}
                  className="h-7 text-xs"
                />
              </div>
            </div>
            {isO2M && (
              <div className="space-y-1">
                <Label className="text-xs">
                  Child Reference FK Column{' '}
                  <span className="text-muted-foreground">
                    (column in child table that stores the reference ID)
                  </span>
                </Label>
                <Input
                  placeholder="benefit_id"
                  value={relation.childReferenceKey ?? ''}
                  onChange={(e) => set('childReferenceKey', e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* One-to-many fields */}
      {isO2M && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Child Table</Label>
              <Input
                placeholder="employee_benefits"
                value={relation.childTable ?? ''}
                onChange={(e) => set('childTable', e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Foreign Key Column <span className="text-muted-foreground">(in child)</span>
              </Label>
              <Input
                placeholder="employee_id"
                value={relation.foreignKey ?? ''}
                onChange={(e) => set('foreignKey', e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          </div>

          {/* Additional child columns */}
          <Label className="text-xs font-medium">Additional Child Columns</Label>
          {(relation.childColumns ?? []).map((col, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                placeholder="sourceField (in extraData row)"
                value={col.sourceField}
                onChange={(e) => setChildColumn(i, { ...col, sourceField: e.target.value })}
                className="h-7 text-xs flex-1"
              />
              <span className="text-muted-foreground text-xs">→</span>
              <Input
                placeholder="targetColumn (in DB)"
                value={col.targetColumn}
                onChange={(e) => setChildColumn(i, { ...col, targetColumn: e.target.value })}
                className="h-7 text-xs flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground"
                onClick={() => removeChildColumn(i)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6 px-2"
            onClick={() => set('childColumns', [...(relation.childColumns ?? []), emptyColumn()])}
          >
            <Plus className="h-3 w-3 mr-1" /> Add Column
          </Button>
        </div>
      )}

      {/* Many-to-many fields */}
      {isM2M && (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Junction Table</Label>
            <Input
              placeholder="employee_skills"
              value={relation.junctionTable ?? ''}
              onChange={(e) => set('junctionTable', e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Parent Key Column</Label>
            <Input
              placeholder="employee_id"
              value={relation.junctionParentKey ?? ''}
              onChange={(e) => set('junctionParentKey', e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Child Key Column</Label>
            <Input
              placeholder="skill_id"
              value={relation.junctionChildKey ?? ''}
              onChange={(e) => set('junctionChildKey', e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Table Editor ─────────────────────────────────────────────────────────────

const TableEditor = ({
  table,
  index,
  totalTables,
  onChange,
  onRemove,
  onSetPrimary,
}: {
  table: TableConfigDto;
  index: number;
  totalTables: number;
  onChange: (t: TableConfigDto) => void;
  onRemove: () => void;
  onSetPrimary: () => void;
}) => {
  const set = (key: keyof TableConfigDto, val: any) => onChange({ ...table, [key]: val });

  const setColumn = (i: number, col: ColumnMappingDto) => {
    const cols = [...(table.columns ?? [])];
    cols[i] = col;
    set('columns', cols);
  };

  const removeColumn = (i: number) => {
    set('columns', table.columns?.filter((_, idx) => idx !== i) ?? []);
  };

  const setExtraField = (i: number, f: ExtraFieldDef) => {
    const fields = [...(table.extraFields ?? [])];
    fields[i] = f;
    set('extraFields', fields);
  };

  const removeExtraField = (i: number) => {
    set('extraFields', table.extraFields?.filter((_, idx) => idx !== i) ?? []);
  };

  const setRelation = (i: number, r: RelationDefDto) => {
    const rels = [...(table.relations ?? [])];
    rels[i] = r;
    set('relations', rels);
  };

  const removeRelation = (i: number) => {
    set('relations', table.relations?.filter((_, idx) => idx !== i) ?? []);
  };

  return (
    <div className="rounded-lg border p-4 space-y-4">
      {/* Table header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <Input
            placeholder="Table name (e.g. employees)"
            value={table.tableName}
            onChange={(e) => set('tableName', e.target.value)}
            className="max-w-[180px]"
          />
          <Input
            placeholder="DB Schema (e.g. public)"
            value={table.tableSchema ?? ''}
            onChange={(e) => set('tableSchema', e.target.value || undefined)}
            className="max-w-[160px]"
          />
          {table.isPrimary ? (
            <Badge
              variant="secondary"
              className="text-xs bg-primary/10 text-primary border-primary/20"
            >
              Primary
            </Badge>
          ) : (
            <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={onSetPrimary}>
              Set as Primary
            </Button>
          )}
        </div>
        {totalTables > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Primary key */}
      <div className="space-y-1">
        <Label className="text-xs">Primary Key Column</Label>
        <Input
          placeholder="id"
          value={table.primaryKey}
          onChange={(e) => set('primaryKey', e.target.value)}
          className="max-w-[180px]"
        />
      </div>

      {/* Column mappings */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Column Mappings (Candidate → DB Column)</Label>
        {(table.columns ?? []).map((col, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Select
              value={col.sourceField}
              onValueChange={(v) => setColumn(i, { ...col, sourceField: v })}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Candidate field" />
              </SelectTrigger>
              <SelectContent>
                {CANDIDATE_FIELDS.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="text-xs">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-xs">→</span>
            <Input
              placeholder="db_column"
              value={col.targetColumn}
              onChange={(e) => setColumn(i, { ...col, targetColumn: e.target.value })}
              className="h-8 text-xs flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => removeColumn(i)}
              disabled={(table.columns?.length ?? 0) <= 1}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2"
          onClick={() => set('columns', [...(table.columns ?? []), emptyColumn()])}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Column
        </Button>
      </div>

      {/* Extra fields (HR fills at hire time) */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">
          Extra Fields{' '}
          <span className="text-muted-foreground font-normal">(HR fills at hire time)</span>
        </Label>
        {(table.extraFields ?? []).map((field, i) => {
          const isRefBacked = !!field.referenceTable;
          return (
            <div key={i} className="rounded border p-3 space-y-2 bg-muted/30">
              <div className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Field Key</Label>
                    <Input
                      placeholder="salary"
                      value={field.fieldKey}
                      onChange={(e) => setExtraField(i, { ...field, fieldKey: e.target.value })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Label (shown to HR)</Label>
                    <Input
                      placeholder="Annual Salary"
                      value={field.label}
                      onChange={(e) => setExtraField(i, { ...field, label: e.target.value })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Field Type</Label>
                    <Select
                      value={field.fieldType}
                      onValueChange={(v) =>
                        setExtraField(i, { ...field, fieldType: v as ExtraFieldDef['fieldType'] })
                      }
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXTRA_FIELD_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Target DB Column</Label>
                    <Input
                      placeholder="annual_salary"
                      value={field.targetColumn}
                      onChange={(e) => setExtraField(i, { ...field, targetColumn: e.target.value })}
                      className="h-7 text-xs"
                    />
                  </div>

                  {/* Select type: choose between hardcoded options or reference table */}
                  {field.fieldType === 'select' && (
                    <div className="col-span-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isRefBacked}
                          onCheckedChange={(v) => {
                            if (!v)
                              setExtraField(i, {
                                ...field,
                                referenceTable: undefined,
                                referenceQuery: undefined,
                                referenceIdField: undefined,
                                referenceDisplayField: undefined,
                                options: [],
                              });
                            else setExtraField(i, { ...field, referenceTable: '', options: [] });
                          }}
                          className="scale-75"
                        />
                        <Label className="text-xs">Load options from reference table</Label>
                      </div>

                      {isRefBacked ? (
                        <div className="rounded border p-2 bg-background space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Reference Table</Label>
                              <Input
                                placeholder="departments"
                                value={field.referenceTable ?? ''}
                                onChange={(e) =>
                                  setExtraField(i, { ...field, referenceTable: e.target.value })
                                }
                                className="h-7 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">ID Field</Label>
                              <Input
                                placeholder="id"
                                value={field.referenceIdField ?? ''}
                                onChange={(e) =>
                                  setExtraField(i, { ...field, referenceIdField: e.target.value })
                                }
                                className="h-7 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Display Field</Label>
                              <Input
                                placeholder="name"
                                value={field.referenceDisplayField ?? ''}
                                onChange={(e) =>
                                  setExtraField(i, {
                                    ...field,
                                    referenceDisplayField: e.target.value,
                                  })
                                }
                                className="h-7 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                Reference Query{' '}
                                <span className="text-muted-foreground">(optional)</span>
                              </Label>
                              <Input
                                placeholder="SELECT id, name FROM departments"
                                value={field.referenceQuery ?? ''}
                                onChange={(e) =>
                                  setExtraField(i, {
                                    ...field,
                                    referenceQuery: e.target.value || undefined,
                                  })
                                }
                                className="h-7 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Label className="text-xs">Options (comma-separated)</Label>
                          <Input
                            placeholder="Engineering, Marketing, Sales"
                            value={(field.options ?? []).join(', ')}
                            onChange={(e) =>
                              setExtraField(i, {
                                ...field,
                                options: e.target.value
                                  .split(',')
                                  .map((o) => o.trim())
                                  .filter(Boolean),
                              })
                            }
                            className="h-7 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 pt-4">
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={field.required ?? false}
                      onCheckedChange={(v) => setExtraField(i, { ...field, required: v })}
                      className="scale-75"
                    />
                    <span className="text-xs text-muted-foreground">Required</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => removeExtraField(i)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2"
          onClick={() => set('extraFields', [...(table.extraFields ?? []), emptyExtraField()])}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Extra Field
        </Button>
      </div>

      {/* Relations */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">
          Relations{' '}
          <span className="text-muted-foreground font-normal">(arrays collected at hire time)</span>
        </Label>
        {(table.relations ?? []).map((rel, i) => (
          <RelationEditor
            key={i}
            relation={rel}
            index={i}
            onChange={(updated) => setRelation(i, updated)}
            onRemove={() => removeRelation(i)}
          />
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2"
          onClick={() => set('relations', [...(table.relations ?? []), emptyRelation()])}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Relation
        </Button>
      </div>
    </div>
  );
};

const StepTables = ({
  tables,
  onChange,
}: {
  tables: TableConfigDto[];
  onChange: (v: TableConfigDto[]) => void;
}) => {
  const updateTable = (i: number, t: TableConfigDto) => {
    const next = [...tables];
    next[i] = t;
    onChange(next);
  };

  const removeTable = (i: number) => onChange(tables.filter((_, idx) => idx !== i));

  const setPrimary = (i: number) =>
    onChange(tables.map((t, idx) => ({ ...t, isPrimary: idx === i })));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold mb-1">Table Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Define which tables to insert into. Mark exactly one as <strong>Primary</strong> — it is
          inserted first and its primary key is used for child relations.
        </p>
      </div>
      <div className="space-y-3">
        {tables.map((t, i) => (
          <TableEditor
            key={i}
            table={t}
            index={i}
            totalTables={tables.length}
            onChange={(updated) => updateTable(i, updated)}
            onRemove={() => removeTable(i)}
            onSetPrimary={() => setPrimary(i)}
          />
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={() => onChange([...tables, emptyTable()])}>
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Table
      </Button>
    </div>
  );
};

// ─── Wizard Shell ─────────────────────────────────────────────────────────────

const STEPS = ['Database Type', 'Connection', 'Tables'];

interface IntegrationConfigWizardProps {
  onSaved: () => void;
  initialConfig?: {
    dbType?: DbType;
    tables?: TableConfigDto[];
  } | null;
}

export default function IntegrationConfigWizard({
  onSaved,
  initialConfig,
}: IntegrationConfigWizardProps) {
  const [step, setStep] = useState(0);
  const [dbType, setDbType] = useState<DbType>(initialConfig?.dbType ?? 'postgresql');
  const [connection, setConnection] = useState<ConnectionDto>({ database: '' });
  const [tables, setTables] = useState<TableConfigDto[]>(
    initialConfig?.tables && initialConfig.tables.length > 0
      ? initialConfig.tables
      : [{ ...emptyTable(), isPrimary: true }]
  );

  const [upsertConfig, { isLoading: isSaving }] = useUpsertIntegrationConfigMutation();
  const [testConnection, { isLoading: isTesting }] = useTestDbConnectionMutation();

  const handleTestConnection = async () => {
    try {
      await testConnection({ dbType, connection }).unwrap();
      toast.success('Connection successful!');
    } catch {
      // Global error handler shows the message
    }
  };

  const handleSave = async () => {
    const primaryCount = tables.filter((t) => t.isPrimary).length;
    if (primaryCount !== 1) {
      toast.error('Exactly one table must be marked as Primary');
      return;
    }
    const missingName = tables.find((t) => !t.tableName.trim());
    if (missingName) {
      toast.error('All tables must have a name');
      return;
    }

    const payload: UpsertIntegrationConfigDto = { dbType, connection, tables };
    try {
      await upsertConfig(payload).unwrap();
      toast.success('Integration config saved. Activate it to start syncing.');
      onSaved();
    } catch {
      // Global error handler shows the message
    }
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium transition-colors ${
                i < step
                  ? 'bg-primary text-primary-foreground'
                  : i === step
                    ? 'bg-primary/20 text-primary border border-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={`text-xs font-medium ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 ${i < step ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[280px]">
        {step === 0 && <StepDbType dbType={dbType} onChange={setDbType} />}
        {step === 1 && (
          <StepConnection
            dbType={dbType}
            connection={connection}
            onChange={setConnection}
            onTest={handleTestConnection}
            isTesting={isTesting}
          />
        )}
        {step === 2 && <StepTables tables={tables} onChange={setTables} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button size="sm" onClick={() => setStep((s) => s + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
