import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private client: Redis;

    constructor(private readonly configService: ConfigService) {
        this.client = new Redis({
            host: this.configService.get<string>('redis.host'),
            port: this.configService.get<number>('redis.port'),
        });
    }

    async get(key: string): Promise<any> {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
    }

    async write(key: string, value: any, ttlSeconds = 86400): Promise<void> {
        const string = JSON.stringify(value);
        await this.client.set(key, string, 'EX', ttlSeconds);
    }

    async writeNx(userId: string, receiver: string): Promise<string> {
        return await this.client.set(
            `busy:${userId}:${receiver}`,
            '1',
            'EX',
            30,
            'NX',
        );
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    onModuleDestroy() {
        this.client.quit();
    }
}
