import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionHistoryService } from './subscription-history.service';

describe('SubscriptionHistoryService', () => {
    let service: SubscriptionHistoryService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SubscriptionHistoryService],
        }).compile();

        service = module.get<SubscriptionHistoryService>(
            SubscriptionHistoryService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
