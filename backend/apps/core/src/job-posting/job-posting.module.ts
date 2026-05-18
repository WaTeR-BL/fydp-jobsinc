import { Module } from '@nestjs/common';
import { JobPostingController } from './job-posting.controller';
import { JobPostingService } from './job-posting.service';
import { RedisService } from '@app/common/redis/redis.service';
import { JobModule } from '../job/job.module';
import { CredentialManagerModule } from '../credential-manager/credential-manager.module';

@Module({
    imports: [CredentialManagerModule, JobModule],
    controllers: [JobPostingController],
    providers: [JobPostingService, RedisService],
    exports: [JobPostingService],
})
export class JobPostingModule {}
