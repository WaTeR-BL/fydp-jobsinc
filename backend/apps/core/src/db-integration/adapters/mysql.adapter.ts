import {
    IDbAdapter,
    ConnectionConfig,
} from '../interfaces/db-adapter.interface';

export class MySQLAdapter implements IDbAdapter {
    private connection: any;

    constructor(private readonly config: ConnectionConfig) {}

    async connect(): Promise<void> {
        let mysql: any;
        try {
            mysql = require('mysql2/promise');
        } catch {
            throw new Error(
                'mysql2 package is not installed. Run: npm install mysql2',
            );
        }
        this.connection = await mysql.createConnection({
            host: this.config.host,
            port: this.config.port ?? 3306,
            database: this.config.database,
            user: this.config.username,
            password: this.config.password,
            ssl: this.config.ssl ? {} : undefined,
        });
    }

    async disconnect(): Promise<void> {
        if (this.connection) await this.connection.end();
    }

    async beginTransaction(): Promise<void> {
        await this.connection.beginTransaction();
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
        const columns = keys.map((k) => `\`${k}\``).join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const query = `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`;
        const [result] = await this.connection.execute(query, values);
        // Return the inserted data merged with the auto-generated insertId
        return { ...data, id: (result as any).insertId };
    }

    async query(
        sql: string,
        params: any[] = [],
    ): Promise<Record<string, any>[]> {
        const [rows] = await this.connection.execute(sql, params);
        return rows as Record<string, any>[];
    }
}
