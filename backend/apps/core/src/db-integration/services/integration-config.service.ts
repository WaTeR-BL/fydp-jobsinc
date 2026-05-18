import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
    IntegrationConfig,
    IntegrationConfigDocument,
} from '@app/common/schemas/integration-config.schema';
import { CredentialEncryptionService } from './credential-encryption.service';
import { AdapterFactory } from '../adapters/adapter.factory';
import {
    TestConnectionDto,
    ToggleActiveDto,
    UpsertIntegrationConfigDto,
} from '../dto/integration-config.dto';

@Injectable()
export class IntegrationConfigService {
    constructor(
        @InjectModel(IntegrationConfig.name)
        private readonly configModel: Model<IntegrationConfigDocument>,
        private readonly encryptionService: CredentialEncryptionService,
    ) {}

    async upsert(
        tenantId: string,
        dto: UpsertIntegrationConfigDto,
    ): Promise<[string, boolean, any]> {
        try {
            const encryptedConnection = this.encryptionService.encrypt(
                dto.connection,
            );
            const config = await this.configModel.findOneAndUpdate(
                { tenantId: new Types.ObjectId(tenantId) },
                {
                    $set: {
                        dbType: dto.dbType,
                        encryptedConnection,
                        tables: dto.tables,
                        // Saving a new config deactivates it until the admin explicitly toggles it on
                        isActive: false,
                    },
                },
                { upsert: true, new: true },
            );
            return [
                'Configuration saved successfully',
                true,
                this.redact(config),
            ];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    async getForTenant(tenantId: string): Promise<[string, boolean, any]> {
        try {
            const config = await this.configModel
                .findOne({ tenantId: new Types.ObjectId(tenantId) })
                .lean();
            if (!config) return ['Success', true, null]; // "not configured" is a valid state
            return ['Success', true, this.redactLean(config)];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    /**
     * Returns the active config with decrypted connection — for internal use only.
     * Never return the result of this method directly to the client.
     */
    async getActive(
        tenantId: string,
    ): Promise<[string, boolean, IntegrationConfigDocument | null]> {
        try {
            const config = await this.configModel.findOne({
                tenantId: new Types.ObjectId(tenantId),
                isActive: true,
            });
            return ['Success', true, config];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    async getRequiredExtraFields(
        tenantId: string,
    ): Promise<[string, boolean, any]> {
        try {
            const config = await this.configModel
                .findOne({
                    tenantId: new Types.ObjectId(tenantId),
                    isActive: true,
                })
                .select('tables')
                .lean();

            if (!config) return ['Success', true, []];

            // Flatten extraFields from all tables and deduplicate by fieldKey
            const allFields = config.tables.flatMap((t) => t.extraFields ?? []);
            const seen = new Set<string>();
            const unique = allFields.filter((f) => {
                if (seen.has(f.fieldKey)) return false;
                seen.add(f.fieldKey);
                return true;
            });

            return ['Success', true, unique];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    /**
     * Returns the full hire schema: scalar extraFields + relation definitions.
     * Used by the hire dialog to render both scalar inputs and array inputs.
     */
    async getHireSchema(tenantId: string): Promise<[string, boolean, any]> {
        try {
            const config = await this.configModel
                .findOne({
                    tenantId: new Types.ObjectId(tenantId),
                    isActive: true,
                })
                .select('tables')
                .lean();

            if (!config)
                return ['Success', true, { extraFields: [], relations: [] }];

            // Scalar extra fields (deduplicated)
            const allFields = config.tables.flatMap((t) => t.extraFields ?? []);
            const seenFields = new Set<string>();
            const extraFields = allFields.filter((f) => {
                if (seenFields.has(f.fieldKey)) return false;
                seenFields.add(f.fieldKey);
                return true;
            });

            // Relation definitions (deduplicated by sourceArrayField)
            const allRelations = config.tables.flatMap(
                (t) => t.relations ?? [],
            );
            const seenRel = new Set<string>();
            const relations = allRelations
                .filter((r) => {
                    if (!r.sourceArrayField) return false;
                    if (seenRel.has(r.sourceArrayField)) return false;
                    seenRel.add(r.sourceArrayField);
                    return true;
                })
                .map((r) => {
                    const cols =
                        r.type === 'one-to-many'
                            ? (r.childColumns ?? [])
                            : (r.relatedColumns ?? []);
                    return {
                        sourceArrayField: r.sourceArrayField,
                        label: this.toLabel(r.sourceArrayField!),
                        type: r.type,
                        hasReference: !!r.referenceTable,
                        referenceTable: r.referenceTable ?? null,
                        referenceIdField: r.referenceIdField ?? 'id',
                        referenceDisplayField:
                            r.referenceDisplayField ?? 'name',
                        columns: cols.map((c) => ({
                            sourceField: c.sourceField,
                            label: this.toLabel(c.sourceField),
                            required: c.required ?? false,
                        })),
                    };
                });

            return ['Success', true, { extraFields, relations }];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    private toLabel(key: string): string {
        return key
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^\w/, (c) => c.toUpperCase())
            .trim();
    }

    async toggleActive(
        tenantId: string,
        dto: ToggleActiveDto,
    ): Promise<[string, boolean]> {
        try {
            const result = await this.configModel.updateOne(
                { tenantId: new Types.ObjectId(tenantId) },
                { $set: { isActive: dto.isActive } },
            );
            if (result.matchedCount === 0) {
                return ['No integration config found for this tenant', false];
            }
            return [
                dto.isActive
                    ? 'Integration activated'
                    : 'Integration deactivated',
                true,
            ];
        } catch (err) {
            return [err.message, false];
        }
    }

    async testConnection(dto: TestConnectionDto): Promise<[string, boolean]> {
        const adapter = AdapterFactory.create(dto.dbType, dto.connection);
        try {
            await adapter.connect();
            return ['Connection successful', true];
        } catch (err) {
            return [`Connection failed: ${err.message}`, false];
        } finally {
            await adapter.disconnect().catch(() => {});
        }
    }

    /** Strip encrypted credentials before returning to the client */
    private redact(doc: IntegrationConfigDocument): Record<string, any> {
        const { encryptedConnection, ...rest } = (doc as any).toObject
            ? (doc as any).toObject()
            : JSON.parse(JSON.stringify(doc));
        return rest;
    }

    private redactLean(doc: Record<string, any>): Record<string, any> {
        const { encryptedConnection, ...rest } = doc;
        return rest;
    }
}
