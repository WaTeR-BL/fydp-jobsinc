import {
    IDbAdapter,
    ConnectionConfig,
} from '../interfaces/db-adapter.interface';

export class MongoDBAdapter implements IDbAdapter {
    private client: any;
    private db: any;
    private session: any;

    constructor(private readonly config: ConnectionConfig) {}

    async connect(): Promise<void> {
        let mongodb: any;
        try {
            mongodb = require('mongodb');
        } catch {
            throw new Error(
                'mongodb package is not installed. Run: npm install mongodb',
            );
        }
        const uri =
            this.config.connectionString ??
            `mongodb://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port ?? 27017}/${this.config.database}`;

        this.client = new mongodb.MongoClient(uri, {
            tls: this.config.ssl ?? false,
        });
        await this.client.connect();
        this.db = this.client.db(this.config.database);
    }

    async disconnect(): Promise<void> {
        if (this.client) await this.client.close();
    }

    async beginTransaction(): Promise<void> {
        this.session = this.client.startSession();
        this.session.startTransaction();
    }

    async commitTransaction(): Promise<void> {
        await this.session?.commitTransaction();
        this.session?.endSession();
    }

    async rollbackTransaction(): Promise<void> {
        await this.session?.abortTransaction();
        this.session?.endSession();
    }

    async insert(
        collection: string,
        data: Record<string, any>,
    ): Promise<Record<string, any>> {
        const result = await this.db
            .collection(collection)
            .insertOne(data, { session: this.session });
        return { ...data, _id: result.insertedId };
    }

    async query(
        sql: string,
        _params: any[] = [],
    ): Promise<Record<string, any>[]> {
        // MongoDB doesn't use SQL — parse "SELECT * FROM collectionName" pattern
        const match = /from\s+["']?(\w+)["']?/i.exec(sql);
        if (!match)
            throw new Error(
                `MongoDBAdapter.query: cannot parse collection from: ${sql}`,
            );
        return this.db
            .collection(match[1])
            .find({}, { session: this.session })
            .toArray();
    }
}
