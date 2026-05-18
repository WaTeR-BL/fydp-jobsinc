import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InterviewRecordingController } from './interview-recording.controller';
import { InterviewRecordingService } from './interview-recording.service';
import {
    InterviewRecording,
    InterviewRecordingSchema,
} from '@app/common/schemas/interview-recording.schema';
import { Job, JobSchema } from '@app/common/schemas/job.schema';
import {
    ApplicantInterview,
    ApplicantInterviewSchema,
} from '@app/common/schemas/applicant-interview.schema';
import { MediaManagerModule } from '@app/common/media-manager/media-manager.module';
import { RmqModule } from '@app/common';
import { RMQ_CONSTANTS } from '@app/common/queue-constants/constants';

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: InterviewRecording.name,
                schema: InterviewRecordingSchema,
            },
            {
                name: Job.name,
                schema: JobSchema,
            },
            {
                name: ApplicantInterview.name,
                schema: ApplicantInterviewSchema,
            },
        ]),
        MediaManagerModule,
        RmqModule.register({
            name: RMQ_CONSTANTS.AI.name,
        }),
    ],
    controllers: [InterviewRecordingController],
    providers: [InterviewRecordingService],
    exports: [InterviewRecordingService],
})
export class InterviewRecordingModule {}
