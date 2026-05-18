import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
    IntegrationRefCache,
    IntegrationRefCacheDocument,
} from '@app/common/schemas/integration-ref-cache.schema';
import { IntegrationConfigDocument } from '@app/common/schemas/integration-config.schema';
import { IntegrationConfigService } from './integration-config.service';
import { CredentialEncryptionService } from './credential-encryption.service';
import { AdapterFactory } from '../adapters/adapter.factory';

@Injectable()
export class ReferenceDataService {
    private readonly logger = new Logger(ReferenceDataService.name);

    constructor(
        @InjectModel(IntegrationRefCache.name)
        private readonly refCacheModel: Model<IntegrationRefCacheDocument>,
        private readonly configService: IntegrationConfigService,
        private readonly encryptionService: CredentialEncryptionService,
    ) {}

    /**
     * Syncs ALL reference tables declared in any relation with a referenceTable field.
     */
    async syncAll(tenantId: string): Promise<[string, boolean, any]> {
        try {
            const [, configOk, config] =
                await this.configService.getActive(tenantId);
            if (!configOk || !config) {
                return ['No active integration config found', false, null];
            }

            const tableKeys = this.extractReferenceTableKeys(config);
            if (!tableKeys.length) {
                return [
                    'Success',
                    true,
                    { synced: [], message: 'No reference tables configured' },
                ];
            }

            const results: Array<{
                tableKey: string;
                count: number;
                error?: string;
            }> = [];

            for (const tableKey of tableKeys) {
                try {
                    await this.doSync(tenantId, tableKey, config);
                    const cached = await this.refCacheModel
                        .findOne({
                            tenantId: new Types.ObjectId(tenantId),
                            tableKey,
                        })
                        .lean();
                    results.push({
                        tableKey,
                        count: cached?.data?.length ?? 0,
                    });
                } catch (err) {
                    this.logger.error(
                        `Failed to sync reference table ${tableKey}: ${err.message}`,
                    );
                    results.push({ tableKey, count: 0, error: err.message });
                }
            }

            return ['Success', true, { synced: results }];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    /**
     * Syncs a single reference table by tableKey.
     */
    async syncTable(
        tenantId: string,
        tableKey: string,
    ): Promise<[string, boolean, any]> {
        try {
            const [, configOk, config] =
                await this.configService.getActive(tenantId);
            if (!configOk || !config) {
                return ['No active integration config found', false, null];
            }

            const rows = await this.doSync(tenantId, tableKey, config);
            return ['Success', true, { tableKey, count: rows.length }];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    /**
     * Returns cached reference data for a specific table.
     */
    async getRefData(
        tenantId: string,
        tableKey: string,
    ): Promise<[string, boolean, any]> {
        try {
            const cached = await this.refCacheModel
                .findOne({ tenantId: new Types.ObjectId(tenantId), tableKey })
                .lean();

            if (!cached) {
                return [
                    'Success',
                    true,
                    { tableKey, data: [], lastSyncedAt: null },
                ];
            }

            return [
                'Success',
                true,
                {
                    tableKey,
                    data: cached.data,
                    lastSyncedAt: cached.lastSyncedAt,
                },
            ];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    /**
     * Lists all reference table keys configured for this tenant (from active config).
     */
    async listRefTables(tenantId: string): Promise<[string, boolean, any]> {
        try {
            const [, configOk, config] =
                await this.configService.getActive(tenantId);
            if (!configOk || !config) {
                return ['Success', true, []];
            }

            const tableKeys = this.extractReferenceTableKeys(config);

            // Enrich with cache metadata
            const caches = await this.refCacheModel
                .find({
                    tenantId: new Types.ObjectId(tenantId),
                    tableKey: { $in: tableKeys },
                })
                .select('tableKey lastSyncedAt')
                .lean();

            const cacheMap = new Map(
                caches.map((c) => [c.tableKey, c.lastSyncedAt]),
            );

            const tables = tableKeys.map((key) => ({
                tableKey: key,
                lastSyncedAt: cacheMap.get(key) ?? null,
                isSynced: cacheMap.has(key),
            }));

            return ['Success', true, tables];
        } catch (err) {
            return [err.message, false, null];
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async doSync(
        tenantId: string,
        tableKey: string,
        config: IntegrationConfigDocument,
    ): Promise<Record<string, any>[]> {
        // Look up the reference query from either a relation or an extraField
        const relation = config.tables
            .flatMap((t) => t.relations ?? [])
            .find((r) => r.referenceTable === tableKey);

        const extraField = config.tables
            .flatMap((t) => t.extraFields ?? [])
            .find((f) => f.referenceTable === tableKey);

        if (!relation && !extraField) {
            throw new Error(
                `No relation or extraField configured for reference table '${tableKey}'`,
            );
        }

        const configuredQuery =
            relation?.referenceQuery ?? extraField?.referenceQuery;

        const connection = this.encryptionService.decrypt(
            config.encryptedConnection,
        );
        const adapter = AdapterFactory.create(config.dbType, connection);

        try {
            await adapter.connect();

            const sql =
                configuredQuery ??
                `SELECT * FROM ${this.quoteIdentifier(tableKey)}`;

            const rows = await adapter.query(sql);

            await this.refCacheModel.findOneAndUpdate(
                { tenantId: new Types.ObjectId(tenantId), tableKey },
                {
                    $set: {
                        query: sql,
                        data: rows,
                        lastSyncedAt: new Date(),
                    },
                },
                { upsert: true, new: true },
            );

            this.logger.log(
                `Synced reference table '${tableKey}' for tenant ${tenantId}: ${rows.length} rows`,
            );

            return rows;
        } finally {
            await adapter.disconnect().catch(() => {});
        }
    }

    private extractReferenceTableKeys(
        config: IntegrationConfigDocument,
    ): string[] {
        const keys = new Set<string>();
        for (const table of config.tables) {
            for (const rel of table.relations ?? []) {
                if (rel.referenceTable) keys.add(rel.referenceTable);
            }
            // Also include reference-backed extraFields (scalar FKs like department_id)
            for (const field of table.extraFields ?? []) {
                if (field.referenceTable) keys.add(field.referenceTable);
            }
        }
        return Array.from(keys);
    }

    private quoteIdentifier(name: string): string {
        // If already contains quotes or a dot (qualified), return as-is
        if (name.includes('"') || name.includes('.')) return name;
        return `"${name}"`;
    }
}
