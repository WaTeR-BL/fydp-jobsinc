import { Module } from '@nestjs/common';
import { ApplicantJobFeedbackService } from './applicant-job-feedback.service';
import { ApplicantJobFeedbackController } from './applicant-job-feedback.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
    ApplicantJobFeedback,
    ApplicantJobFeedbackSchema,
    InterviewEvaluation,
    InterviewEvaluationSchema,
} from '@app/common';
import { EmailModule } from '../email/email.module';
import { ApplicantModule } from '../applicant/applicant.module';

@Module({
    providers: [ApplicantJobFeedbackService],
    controllers: [ApplicantJobFeedbackController],
    imports: [
        EmailModule,
        ApplicantModule,
        MongooseModule.forFeature([
            {
                name: ApplicantJobFeedback.name,
                schema: ApplicantJobFeedbackSchema,
            },
            {
                name: InterviewEvaluation.name,
                schema: InterviewEvaluationSchema,
            },
        ]),
    ],
    exports: [ApplicantJobFeedbackService],
})
export class ApplicantJobFeedbackModule {}
