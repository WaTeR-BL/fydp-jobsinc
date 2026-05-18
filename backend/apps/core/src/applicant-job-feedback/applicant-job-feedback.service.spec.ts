import { Test, TestingModule } from '@nestjs/testing';
import { ApplicantJobFeedbackService } from './applicant-job-feedback.service';

describe('ApplicantJobFeedbackService', () => {
    let service: ApplicantJobFeedbackService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ApplicantJobFeedbackService],
        }).compile();

        service = module.get<ApplicantJobFeedbackService>(
            ApplicantJobFeedbackService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
