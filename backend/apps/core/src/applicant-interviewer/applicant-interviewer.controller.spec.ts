import { Test, TestingModule } from '@nestjs/testing';
import { ApplicantInterviewerController } from './applicant-interviewer.controller';

describe('ApplicantInterviewerController', () => {
    let controller: ApplicantInterviewerController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ApplicantInterviewerController],
        }).compile();

        controller = module.get<ApplicantInterviewerController>(
            ApplicantInterviewerController,
        );
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
