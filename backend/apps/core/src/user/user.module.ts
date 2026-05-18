import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User, UserSchema } from '@app/common';
import { EmailModule } from '../email/email.module';
import { TenantModule } from '../tenant/tenant.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        EmailModule,
        TenantModule,
    ],
    providers: [UserService],
    exports: [MongooseModule, UserService],
    controllers: [UserController],
})
export class UserModule {}
