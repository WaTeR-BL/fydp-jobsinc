import { CredentialManagerService } from './credential-manager.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
    CredentialManager,
    CredentialManagerSchema,
} from '@app/common/schemas/credential-manager.schema';
import { Module } from '@nestjs/common';
import { CredentialManagerController } from './credential-manager.controller';

@Module({
    controllers: [CredentialManagerController],
    providers: [CredentialManagerService],
    exports: [CredentialManagerService],
    imports: [
        MongooseModule.forFeature([
            {
                name: CredentialManager.name,
                schema: CredentialManagerSchema,
            },
        ]),
    ],
})
export class CredentialManagerModule {}
