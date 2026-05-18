import {
    IDbAdapter,
    ConnectionConfig,
} from '../interfaces/db-adapter.interface';

export class PostgresAdapter implements IDbAdapter {
    private client: any;

    constructor(private readonly config: ConnectionConfig) {}

    async connect(): Promise<void> {
        let pg: any;
        try {
            pg = require('pg');
        } catch {
            throw new Error(
                'pg package is not installed. Run: npm install pg @types/pg',
            );
        }

        const clientConfig = this.config.connectionString
            ? {
                  connectionString: this.config.connectionString,
                  ssl: { rejectUnauthorized: false },
              }
            : {
                  host: this.config.host,
                  port: this.config.port ?? 5432,
                  database: this.config.database,
                  user: this.config.username,
                  password: this.config.password,
                  ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
              };

        this.client = new pg.Client(clientConfig);
        await this.client.connect();
    }

    async disconnect(): Promise<void> {
        if (this.client) await this.client.end();
    }

    async beginTransaction(): Promise<void> {
        await this.client.query('BEGIN');
    }

    async commitTransaction(): Promise<void> {
        await this.client.query('COMMIT');
    }

    async rollbackTransaction(): Promise<void> {
        await this.client.query('ROLLBACK');
    }

    async insert(
        table: string,
        data: Record<string, any>,
    ): Promise<Record<string, any>> {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const columns = keys.map((k) => `"${k}"`).join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        // table may already be a qualified name like "public"."employees" — pass as-is
        const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
        const result = await this.client.query(query, values);
        return result.rows[0];
    }

    async query(
        sql: string,
        params: any[] = [],
    ): Promise<Record<string, any>[]> {
        const result = await this.client.query(sql, params);
        return result.rows;
    }
}
