import { Test, TestingModule } from '@nestjs/testing';
import { AccountProvisioningService } from './account-provisioning.service';

describe('AccountProvisioningService', () => {
    let service: AccountProvisioningService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AccountProvisioningService],
        }).compile();

        service = module.get<AccountProvisioningService>(
            AccountProvisioningService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
