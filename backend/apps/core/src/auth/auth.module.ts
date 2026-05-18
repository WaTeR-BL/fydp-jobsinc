import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { AtStrategy } from './strategies/at.strategy';
import { RtStrategy } from './strategies/rt.strategy';
import { UserService } from '../user/user.service';
import { EmailModule } from '../email/email.module';
import { TenantModule } from '../tenant/tenant.module';
import { ApplicantModule } from '../applicant/applicant.module';

@Module({
    imports: [
        UserModule,
        PassportModule,
        JwtModule.register({}),
        EmailModule,
        TenantModule,
        ApplicantModule,
    ],
    controllers: [AuthController],
    providers: [UserService, AuthService, AtStrategy, RtStrategy],
})
export class AuthModule {}
