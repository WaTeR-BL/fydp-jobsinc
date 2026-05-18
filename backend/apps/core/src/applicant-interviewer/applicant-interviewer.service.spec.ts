import { Test, TestingModule } from '@nestjs/testing';
import { ApplicantInterviewerService } from './applicant-interviewer.service';

describe('ApplicantInterviewerService', () => {
    let service: ApplicantInterviewerService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ApplicantInterviewerService],
        }).compile();

        service = module.get<ApplicantInterviewerService>(
            ApplicantInterviewerService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
