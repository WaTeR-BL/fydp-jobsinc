import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionHistoryController } from './subscription-history.controller';

describe('SubscriptionHistoryController', () => {
    let controller: SubscriptionHistoryController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SubscriptionHistoryController],
        }).compile();

        controller = module.get<SubscriptionHistoryController>(
            SubscriptionHistoryController,
        );
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
