import { Module } from '@nestjs/common';
import { InterviewerController } from './interviewer.controller';
import { InterviewerService } from './interviewer.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
    Interviewer,
    InterviewerSchema,
} from '@app/common/schemas/interviewer.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Interviewer.name, schema: InterviewerSchema },
        ]),
    ],
    controllers: [InterviewerController],
    providers: [InterviewerService],
    exports: [InterviewerService],
})
export class InterviewerModule {}
