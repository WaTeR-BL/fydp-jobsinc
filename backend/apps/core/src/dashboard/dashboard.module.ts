import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    ApplicantInterview,
    ApplicantInterviewSchema,
    ApplicantJobFeedback,
    ApplicantJobFeedbackSchema,
    Domain,
    DomainSchema,
    Job,
    JobSchema,
    Tenant,
    TenantSchema,
    User,
    UserSchema,
} from '@app/common';
import { DashboardService } from './dasboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Job.name, schema: JobSchema },
            { name: Domain.name, schema: DomainSchema },
            { name: User.name, schema: UserSchema },
            { name: ApplicantJobFeedback.name, schema: ApplicantJobFeedbackSchema },
            { name: ApplicantInterview.name, schema: ApplicantInterviewSchema },
            { name: Tenant.name, schema: TenantSchema },
        ]),
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule {}
