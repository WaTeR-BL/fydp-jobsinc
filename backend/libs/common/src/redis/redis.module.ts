import { Module } from '@nestjs/common';
import { RedisService } from '@app/common/redis/redis.service';

@Module({
    providers: [RedisService],
    exports: [RedisService],
})
export class RedisModule {}
