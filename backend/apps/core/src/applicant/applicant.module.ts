import { Module } from '@nestjs/common';
import { ApplicantService } from './applicant.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Applicant, ApplicantSchema } from '@app/common';
import { EmailModule } from '../email/email.module';
import { ApplicantController } from './applicant.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Applicant.name, schema: ApplicantSchema },
        ]),
        EmailModule,
    ],
    providers: [ApplicantService],
    exports: [ApplicantService],
    controllers: [ApplicantController],
})
export class ApplicantModule {}
