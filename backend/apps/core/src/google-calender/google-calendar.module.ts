import { Module } from '@nestjs/common';
import { GoogleCalendarController } from './google-calendar.controller';
import { GoogleCalendarService } from './google-calendar.service';
import { CredentialManagerModule } from '../credential-manager/credential-manager.module';
import { RedisService } from '@app/common/redis/redis.service';

@Module({
    imports: [CredentialManagerModule],
    providers: [GoogleCalendarService, RedisService],
    controllers: [GoogleCalendarController],
    exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
