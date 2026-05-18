import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
    IntegrationExecution,
    IntegrationExecutionDocument,
} from '@app/common/schemas/integration-execution.schema';
import {
    IntegrationConfigDocument,
    ColumnMapping,
    RelationDef,
} from '@app/common/schemas/integration-config.schema';
import {
    Applicant,
    ApplicantDocument,
} from '@app/common/schemas/applicant.schema';
import {
    ApplicantJobFeedback,
    ApplicantJobFeedbackDocument,
} from '@app/common/schemas/applicant-job-feedback.schema';
import { Job, JobDocument } from '@app/common/schemas/job.schema';
import {
    IntegrationExecutionStatus,
    RelationType,
} from '@app/common/enums/app.enums';
import { IntegrationConfigService } from './integration-config.service';
import { CredentialEncryptionService } from './credential-encryption.service';
import { AdapterFactory } from '../adapters/adapter.factory';
import { IDbAdapter } from '../interfaces/db-adapter.interface';
import { Candidate } from '../interfaces/candidate.interface';

@Injectable()
export class IntegrationSyncService {
    private readonly logger = new Logger(IntegrationSyncService.name);

    constructor(
        @InjectModel(IntegrationExecution.name)
        private readonly executionModel: Model<IntegrationExecutionDocument>,
        @InjectModel(Applicant.name)
        private readonly applicantModel: Model<ApplicantDocument>,
        @InjectModel(ApplicantJobFeedback.name)
        private readonly feedbackModel: Model<ApplicantJobFeedbackDocument>,
        @InjectModel(Job.name)
        private readonly jobModel: Model<JobDocument>,
        private readonly configService: IntegrationConfigService,
        private readonly encryptionService: CredentialEncryptionService,
    ) {}

    /**
     * Entry point called fire-and-forget from the hire action.
     * Never throws — all errors are persisted into IntegrationExecution.
     */
    async syncCandidate(
        feedbackId: string,
        extraData: Record<string, any>,
    ): Promise<void> {
        try {
            // ── Idempotency: skip if already synced successfully ──────────────
            const succeeded = await this.executionModel.findOne({
                feedbackId: new Types.ObjectId(feedbackId),
                status: IntegrationExecutionStatus.SUCCESS,
            });
            if (succeeded) {
                this.logger.log(
                    `Sync skipped — already succeeded for feedbackId ${feedbackId}`,
                );
                return;
            }

            // ── Assemble Candidate ────────────────────────────────────────────
            const candidate = await this.assembleCandidate(feedbackId);
            if (!candidate) {
                this.logger.error(
                    `Sync aborted — feedback ${feedbackId} not found`,
                );
                return;
            }

            // ── Fetch active config for this tenant ───────────────────────────
            const [, configOk, config] = await this.configService.getActive(
                candidate.tenantId,
            );
            if (!configOk || !config) {
                this.logger.log(
                    `Sync skipped — no active integration config for tenant ${candidate.tenantId}`,
                );
                return;
            }

            // ── Create execution record (PENDING) ─────────────────────────────
            const execution = await this.executionModel.create({
                tenantId: new Types.ObjectId(candidate.tenantId),
                configId: config._id,
                feedbackId: new Types.ObjectId(feedbackId),
                candidateSnapshot: candidate,
                extraDataSnapshot: extraData,
                status: IntegrationExecutionStatus.PENDING,
                attemptCount: 0,
            });

            // ── Run the sync ──────────────────────────────────────────────────
            await this.runSync(
                execution._id.toString(),
                candidate,
                extraData,
                config,
            );
        } catch (err) {
            this.logger.error(
                `Unexpected error in syncCandidate for ${feedbackId}: ${err.message}`,
            );
        }
    }

    async retryExecution(
        executionId: string,
        tenantId: string,
    ): Promise<[string, boolean]> {
        try {
            const execution = await this.executionModel.findOne({
                _id: new Types.ObjectId(executionId),
                tenantId: new Types.ObjectId(tenantId),
            });
            if (!execution) return ['Execution not found', false];
            if (execution.status === IntegrationExecutionStatus.SUCCESS) {
                return [
                    'Execution already succeeded — retry not needed',
                    false,
                ];
            }

            const [, configOk, config] =
                await this.configService.getActive(tenantId);
            if (!configOk || !config) {
                return ['No active integration config found', false];
            }

            execution.status = IntegrationExecutionStatus.PENDING;
            await execution.save();

            // Run async — caller gets an immediate response
            this.runSync(
                execution._id.toString(),
                execution.candidateSnapshot as Candidate,
                execution.extraDataSnapshot as Record<string, any>,
                config,
            ).catch((err) =>
                this.logger.error(`Retry runSync failed: ${err.message}`),
            );

            return ['Retry initiated', true];
        } catch (err) {
            return [err.message, false];
        }
    }

    async getExecutions(
        tenantId: string,
        status?: IntegrationExecutionStatus,
        page = 1,
        limit = 10,
    ): Promise<[string, boolean, any]> {
        try {
            const filter: Record<string, any> = {
                tenantId: new Types.ObjectId(tenantId),
            };
            if (status) filter.status = status;

            const [items, total] = await Promise.all([
                this.executionModel
                    .find(filter)
                    .sort({ createdAt: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean(),
                this.executionModel.countDocuments(filter),
            ]);

            return ['Success', true, { items, total, page, limit }];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    async getExecution(
        executionId: string,
        tenantId: string,
    ): Promise<[string, boolean, any]> {
        try {
            const execution = await this.executionModel
                .findOne({
                    _id: new Types.ObjectId(executionId),
                    tenantId: new Types.ObjectId(tenantId),
                })
                .lean();
            if (!execution) return ['Execution not found', false, null];
            return ['Success', true, execution];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    private async runSync(
        executionId: string,
        candidate: Candidate,
        extraData: Record<string, any>,
        config: IntegrationConfigDocument,
    ): Promise<void> {
        const connection = this.encryptionService.decrypt(
            config.encryptedConnection,
        );
        const adapter = AdapterFactory.create(config.dbType, connection);

        try {
            await adapter.connect();
            await adapter.beginTransaction();

            const primaryTable = config.tables.find((t) => t.isPrimary);
            let primaryPK: any = null;

            if (primaryTable) {
                const row = this.buildRow(
                    primaryTable.columns,
                    primaryTable.extraFields ?? [],
                    candidate,
                    extraData,
                );
                const inserted = await adapter.insert(
                    this.qualifyTable(
                        primaryTable.tableName,
                        primaryTable.tableSchema,
                    ),
                    row,
                );
                primaryPK = inserted[primaryTable.primaryKey];

                for (const relation of primaryTable.relations ?? []) {
                    await this.processRelation(
                        adapter,
                        relation,
                        candidate,
                        extraData,
                        primaryPK,
                        primaryTable.tableSchema,
                    );
                }
            }

            // Insert remaining (non-primary) tables
            for (const table of config.tables.filter((t) => !t.isPrimary)) {
                const row = this.buildRow(
                    table.columns,
                    table.extraFields ?? [],
                    candidate,
                    extraData,
                );
                await adapter.insert(
                    this.qualifyTable(table.tableName, table.tableSchema),
                    row,
                );
            }

            await adapter.commitTransaction();

            await this.executionModel.findByIdAndUpdate(executionId, {
                status: IntegrationExecutionStatus.SUCCESS,
                error: null,
                lastAttemptAt: new Date(),
                $inc: { attemptCount: 1 },
            });

            this.logger.log(`Sync SUCCESS for execution ${executionId}`);
        } catch (err) {
            await adapter.rollbackTransaction().catch(() => {});

            // Sanitize error — strip any connection string fragments
            const safeError = this.sanitizeError(err.message);

            await this.executionModel.findByIdAndUpdate(executionId, {
                status: IntegrationExecutionStatus.FAILED,
                error: safeError,
                lastAttemptAt: new Date(),
                $inc: { attemptCount: 1 },
            });

            this.logger.error(
                `Sync FAILED for execution ${executionId}: ${safeError}`,
            );
        } finally {
            await adapter.disconnect().catch(() => {});
        }
    }

    private async processRelation(
        adapter: IDbAdapter,
        relation: RelationDef,
        candidate: Candidate,
        extraData: Record<string, any>,
        parentPK: any,
        parentTableSchema?: string,
    ): Promise<void> {
        const sourceArray: any[] =
            extraData[relation.sourceArrayField ?? ''] ?? [];

        if (sourceArray.length === 0) return;

        if (relation.type === RelationType.ONE_TO_MANY) {
            // Determine child table name (may be schema-qualified)
            const childTableName = this.qualifyTable(
                relation.childTable,
                parentTableSchema,
            );

            for (const item of sourceArray) {
                if (relation.referenceTable) {
                    // O2M with master reference:
                    // item = { referenceId: <masterPK>, ...otherFields }
                    const row: Record<string, any> = {
                        [relation.foreignKey]: parentPK,
                        [relation.childReferenceKey]: item['referenceId'],
                    };
                    // Map any additional childColumns from item
                    for (const col of relation.childColumns ?? []) {
                        if (col.sourceField !== 'referenceId') {
                            row[col.targetColumn] =
                                item[col.sourceField] ??
                                col.defaultValue ??
                                null;
                        }
                    }
                    await adapter.insert(childTableName, row);
                } else {
                    // Plain O2M: insert child row
                    const row = this.buildRowFromItem(
                        relation.childColumns ?? [],
                        item,
                    );
                    row[relation.foreignKey] = parentPK;
                    await adapter.insert(childTableName, row);
                }
            }
        } else if (relation.type === RelationType.MANY_TO_MANY) {
            const junctionTableName = this.qualifyTable(
                relation.junctionTable,
                parentTableSchema,
            );

            if (relation.referenceTable) {
                // M2M with reference: sourceArray is an array of reference IDs
                // Just insert junction rows — reference records already exist
                for (const refId of sourceArray) {
                    await adapter.insert(junctionTableName, {
                        [relation.junctionParentKey]: parentPK,
                        [relation.junctionChildKey]: refId,
                    });
                }
            } else {
                // Plain M2M: insert into relatedTable first, then junction
                const relatedTableName = this.qualifyTable(
                    relation.relatedTable,
                    parentTableSchema,
                );
                for (const item of sourceArray) {
                    const relatedRow = this.buildRowFromItem(
                        relation.relatedColumns ?? [],
                        item,
                    );
                    const insertedRelated = await adapter.insert(
                        relatedTableName,
                        relatedRow,
                    );
                    const relatedPK =
                        insertedRelated[relation.relatedPrimaryKey];
                    await adapter.insert(junctionTableName, {
                        [relation.junctionParentKey]: parentPK,
                        [relation.junctionChildKey]: relatedPK,
                    });
                }
            }
        }
    }

    private qualifyTable(tableName: string, tableSchema?: string): string {
        if (tableSchema) {
            return `"${tableSchema}"."${tableName}"`;
        }
        return `"${tableName}"`;
    }

    /**
     * Builds a target DB row from Candidate fields + HR-supplied extraData fields.
     */
    private buildRow(
        columns: ColumnMapping[],
        extraFields: any[],
        candidate: Candidate,
        extraData: Record<string, any>,
    ): Record<string, any> {
        const row: Record<string, any> = {};

        for (const col of columns) {
            const val =
                (candidate as Record<string, any>)[col.sourceField] ??
                col.defaultValue ??
                null;
            row[col.targetColumn] = val;
        }

        for (const field of extraFields) {
            const val = extraData[field.fieldKey] ?? null;
            row[field.targetColumn] = val;
        }

        return row;
    }

    /**
     * Builds a row from a single item object using column mappings.
     * Used for child rows in relations.
     */
    private buildRowFromItem(
        columns: ColumnMapping[],
        item: Record<string, any>,
    ): Record<string, any> {
        const row: Record<string, any> = {};
        for (const col of columns) {
            row[col.targetColumn] =
                item[col.sourceField] ?? col.defaultValue ?? null;
        }
        return row;
    }

    private async assembleCandidate(
        feedbackId: string,
    ): Promise<Candidate | null> {
        const feedback = await this.feedbackModel.findById(feedbackId).lean();
        if (!feedback) return null;

        const [applicant, job] = await Promise.all([
            this.applicantModel.findById(feedback.applicantId).lean(),
            this.jobModel.findById(feedback.jobId).select('title').lean(),
        ]);

        if (!applicant) return null;

        return {
            fullName: applicant.fullName,
            email: applicant.email,
            contact: applicant.contact,
            timezone: applicant.timezone,
            cvUrl: feedback.cvUrl,
            cvMatch: feedback.cvMatch,
            feedback: feedback.feedback,
            applicantId: feedback.applicantId.toString(),
            feedbackId,
            tenantId: feedback.tenantId.toString(),
            jobId: feedback.jobId.toString(),
            jobTitle: job?.title,
        };
    }

    /** Prevents connection strings from leaking into stored error messages */
    private sanitizeError(message: string): string {
        return message
            .replace(/mongodb(\+srv)?:\/\/[^\s]*/gi, '[redacted]')
            .replace(/password=[^\s&;]*/gi, 'password=[redacted]')
            .slice(0, 1000);
    }
}
