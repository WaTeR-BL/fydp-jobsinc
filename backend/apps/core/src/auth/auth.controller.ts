import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Initialize2FADto, LoginDto, Verify2FADto } from './dto/auth.dto';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { Public } from '../common/decorators/public.decorator';
import { RtGuard } from '../common/guards/rt.guard';
import { Claims } from '../common/decorators/claims.decorator';
import { JwtPayloadWithRt } from './types/jwt-payload-rt.type';
import { JwtPayload } from './types/jwt-payload.type';
import { RequireTenant } from '../common/decorators/require-tenant.decorator';

@Controller('auths')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto) {
        const result = await this.authService.login(dto);
        return handleServiceResponse(result);
    }

    @Public()
    @Post('two-fa/init')
    @HttpCode(HttpStatus.OK)
    async initialize2FA(@Body() dto: Initialize2FADto) {
        const result = await this.authService.initialize2FA(dto);
        return handleServiceResponse(result);
    }

    @Public()
    @Post('two-fa/verify')
    @HttpCode(HttpStatus.OK)
    async verify2FA(@Body() dto: Verify2FADto) {
        const result = await this.authService.verify2FASetup(dto);
        return handleServiceResponse(result);
    }

    @Post('logout')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async logout(@Claims() user: JwtPayload) {
        const result = await this.authService.logout(user['sub']);
        return handleServiceResponse(result);
    }

    @Public()
    @UseGuards(RtGuard)
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshToken(@Claims() user: JwtPayloadWithRt) {
        const result = await this.authService.refreshToken(
            user['sub'],
            user['tenantId'],
            user['refreshToken'],
        );
        return handleServiceResponse(result);
    }

    @Public()
    @Post('applicant/login')
    @HttpCode(HttpStatus.OK)
    async ApplicantLogin(@Body() dto: LoginDto) {
        const result = await this.authService.applicantLogin(dto);
        return handleServiceResponse(result);
    }

    @Post('applicant/logout')
    @HttpCode(HttpStatus.OK)
    async applicantLogout(@Claims() user: JwtPayload) {
        const result = await this.authService.applicantLogout(user['sub']);
        return handleServiceResponse(result);
    }

    @Public()
    @UseGuards(RtGuard)
    @Post('applicant/refresh')
    @HttpCode(HttpStatus.OK)
    async applicantRefreshToken(@Claims() user: JwtPayloadWithRt) {
        const result = await this.authService.refreshApplicantToken(
            user['sub'],
            user['refreshToken'],
        );
        return handleServiceResponse(result);
    }
}
