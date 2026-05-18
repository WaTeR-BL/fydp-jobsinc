import { Test, TestingModule } from '@nestjs/testing';
import { AccountProvisioningController } from './account-provisioning.controller';

describe('AccountProvisioningController', () => {
    let controller: AccountProvisioningController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AccountProvisioningController],
        }).compile();

        controller = module.get<AccountProvisioningController>(
            AccountProvisioningController,
        );
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
