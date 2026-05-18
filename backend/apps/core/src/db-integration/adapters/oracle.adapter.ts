import {
    IDbAdapter,
    ConnectionConfig,
} from '../interfaces/db-adapter.interface';

export class OracleAdapter implements IDbAdapter {
    private connection: any;
    private oracledb: any;

    constructor(private readonly config: ConnectionConfig) {}

    async connect(): Promise<void> {
        try {
            this.oracledb = require('oracledb');
        } catch {
            throw new Error(
                'oracledb package is not installed or Oracle Instant Client is missing. ' +
                    'Run: npm install oracledb and install Oracle Instant Client.',
            );
        }
        this.oracledb.outFormat = this.oracledb.OUT_FORMAT_OBJECT;

        const connectString =
            this.config.connectionString ??
            `${this.config.host}:${this.config.port ?? 1521}/${this.config.database}`;

        this.connection = await this.oracledb.getConnection({
            user: this.config.username,
            password: this.config.password,
            connectString,
        });
    }

    async disconnect(): Promise<void> {
        if (this.connection) await this.connection.close();
    }

    async beginTransaction(): Promise<void> {
        // Oracle starts transactions implicitly on the first DML statement.
        // No explicit BEGIN is needed.
    }

    async commitTransaction(): Promise<void> {
        await this.connection.commit();
    }

    async rollbackTransaction(): Promise<void> {
        await this.connection.rollback();
    }

    async insert(
        table: string,
        data: Record<string, any>,
    ): Promise<Record<string, any>> {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const columns = keys.join(', ');
        const binds = keys.map((_, i) => `:${i + 1}`).join(', ');
        // Use RETURNING to capture the generated row identifier
        const query = `INSERT INTO ${table} (${columns}) VALUES (${binds}) RETURNING ROWID INTO :rowid`;
        const bindValues: any[] = [
            ...values,
            { dir: this.oracledb.BIND_OUT, type: this.oracledb.STRING },
        ];
        const result = await this.connection.execute(query, bindValues, {
            autoCommit: false,
        });
        const rowid = result.outBinds?.[result.outBinds.length - 1]?.[0];
        return { ...data, rowid };
    }

    async query(
        sql: string,
        params: any[] = [],
    ): Promise<Record<string, any>[]> {
        const result = await this.connection.execute(sql, params, {
            outFormat: this.oracledb.OUT_FORMAT_OBJECT,
        });
        return result.rows ?? [];
    }
}
