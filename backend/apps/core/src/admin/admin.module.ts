import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    ApplicantJobFeedback,
    ApplicantJobFeedbackSchema,
    Job,
    JobSchema,
    Subscription,
    SubscriptionSchema,
    Tenant,
    TenantSchema,
    User,
    UserSchema,
} from '@app/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Tenant.name, schema: TenantSchema },
            { name: User.name, schema: UserSchema },
            { name: Job.name, schema: JobSchema },
            { name: ApplicantJobFeedback.name, schema: ApplicantJobFeedbackSchema },
            { name: Subscription.name, schema: SubscriptionSchema },
        ]),
        EmailModule,
    ],
    controllers: [AdminController],
    providers: [AdminService],
})
export class AdminModule {}
