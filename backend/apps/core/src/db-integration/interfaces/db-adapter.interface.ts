export interface ConnectionConfig {
    host?: string;
    port?: number;
    database: string;
    username?: string;
    password?: string;
    connectionString?: string; // for MongoDB or full DSN strings
    ssl?: boolean;
}

export interface IDbAdapter {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    beginTransaction(): Promise<void>;
    commitTransaction(): Promise<void>;
    rollbackTransaction(): Promise<void>;
    /**
     * Inserts a row into the given table/collection.
     * Returns the full inserted record including any auto-generated primary keys.
     */
    insert(
        table: string,
        data: Record<string, any>,
    ): Promise<Record<string, any>>;

    /**
     * Executes a raw SELECT query and returns all rows.
     * Used for fetching reference/master data from the destination DB.
     */
    query(sql: string, params?: any[]): Promise<Record<string, any>[]>;
}
