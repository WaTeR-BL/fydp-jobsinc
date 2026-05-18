import { Connection, ClientSession } from 'mongoose';

export async function runTransaction<T>(
    connection: Connection,
    work: (session: ClientSession) => Promise<T>,
): Promise<T> {
    const session = await connection.startSession();
    try {
        return await session.withTransaction(async () => {
            return work(session);
        });
    } finally {
        await session.endSession();
    }
}
