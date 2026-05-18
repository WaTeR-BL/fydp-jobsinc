import { Test, TestingModule } from '@nestjs/testing';
import { InterviewerService } from './interviewer.service';

describe('InterviewerService', () => {
    let service: InterviewerService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [InterviewerService],
        }).compile();

        service = module.get<InterviewerService>(InterviewerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
