import { Test, TestingModule } from '@nestjs/testing';
import { InterviewerController } from './interviewer.controller';

describe('InterviewerController', () => {
    let controller: InterviewerController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [InterviewerController],
        }).compile();

        controller = module.get<InterviewerController>(InterviewerController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
