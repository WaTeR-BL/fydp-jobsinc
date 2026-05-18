import { DbType } from '@app/common/enums/app.enums';
import {
    ConnectionConfig,
    IDbAdapter,
} from '../interfaces/db-adapter.interface';
import { PostgresAdapter } from './postgres.adapter';
import { MySQLAdapter } from './mysql.adapter';
import { MSSQLAdapter } from './mssql.adapter';
import { OracleAdapter } from './oracle.adapter';
import { MongoDBAdapter } from './mongodb.adapter';

export class AdapterFactory {
    static create(dbType: DbType, config: ConnectionConfig): IDbAdapter {
        switch (dbType) {
            case DbType.POSTGRESQL:
                return new PostgresAdapter(config);
            case DbType.MYSQL:
                return new MySQLAdapter(config);
            case DbType.MSSQL:
                return new MSSQLAdapter(config);
            case DbType.ORACLE:
                return new OracleAdapter(config);
            case DbType.MONGODB:
                return new MongoDBAdapter(config);
            default:
                throw new Error(`Unsupported database type: ${dbType}`);
        }
    }
}
