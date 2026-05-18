import {
    IDbAdapter,
    ConnectionConfig,
} from '../interfaces/db-adapter.interface';

export class MSSQLAdapter implements IDbAdapter {
    private pool: any;
    private transaction: any;
    private mssql: any;

    constructor(private readonly config: ConnectionConfig) {}

    async connect(): Promise<void> {
        try {
            this.mssql = require('mssql');
        } catch {
            throw new Error(
                'mssql package is not installed. Run: npm install mssql',
            );
        }
        this.pool = await this.mssql.connect({
            server: this.config.host,
            port: this.config.port ?? 1433,
            database: this.config.database,
            user: this.config.username,
            password: this.config.password,
            options: {
                encrypt: this.config.ssl ?? false,
                trustServerCertificate: true,
            },
        });
    }

    async disconnect(): Promise<void> {
        if (this.pool) await this.pool.close();
    }

    async beginTransaction(): Promise<void> {
        this.transaction = new this.mssql.Transaction(this.pool);
        await this.transaction.begin();
    }

    async commitTransaction(): Promise<void> {
        await this.transaction.commit();
    }

    async rollbackTransaction(): Promise<void> {
        await this.transaction.rollback();
    }

    async insert(
        table: string,
        data: Record<string, any>,
    ): Promise<Record<string, any>> {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const columns = keys.map((k) => `[${k}]`).join(', ');
        const params = keys.map((_, i) => `@p${i}`).join(', ');
        const query = `INSERT INTO [${table}] (${columns}) OUTPUT INSERTED.* VALUES (${params})`;

        const request = this.transaction
            ? new this.mssql.Request(this.transaction)
            : new this.mssql.Request(this.pool);

        keys.forEach((_, i) => request.input(`p${i}`, values[i]));

        const result = await request.query(query);
        return result.recordset[0];
    }

    async query(
        sql: string,
        _params: any[] = [],
    ): Promise<Record<string, any>[]> {
        const request = this.transaction
            ? new this.mssql.Request(this.transaction)
            : new this.mssql.Request(this.pool);
        const result = await request.query(sql);
        return result.recordset;
    }
}
