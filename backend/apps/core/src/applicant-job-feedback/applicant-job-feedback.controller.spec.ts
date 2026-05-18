import { Test, TestingModule } from '@nestjs/testing';
import { ApplicantJobFeedbackController } from './applicant-job-feedback.controller';

describe('ApplicantJobFeedbackController', () => {
    let controller: ApplicantJobFeedbackController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ApplicantJobFeedbackController],
        }).compile();

        controller = module.get<ApplicantJobFeedbackController>(
            ApplicantJobFeedbackController,
        );
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
