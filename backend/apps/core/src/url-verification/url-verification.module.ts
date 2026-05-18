import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from '@app/common/redis/redis.service';
import { UrlVerificationService } from './url-verification.service';
import { UrlVerificationController } from './url-verification.controller';

@Module({
    imports: [ConfigModule],
    controllers: [UrlVerificationController],
    providers: [UrlVerificationService, RedisService],
    exports: [UrlVerificationService],
})
export class UrlVerificationModule {}
