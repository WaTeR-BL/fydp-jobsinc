import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Query,
    Res,
} from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { Public } from '../common/decorators/public.decorator';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { Claims } from '../common/decorators/claims.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { RequireTenant } from '../common/decorators/require-tenant.decorator';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('google-calendar')
@RequireTenant()
export class GoogleCalendarController {
    private readonly frontendUrl: string;
    constructor(
        private readonly googleCalendarService: GoogleCalendarService,
        private readonly config: ConfigService,
    ) {
        this.frontendUrl = this.config.get<string>('frontend.url');
    }

    @Get('init')
    @HttpCode(HttpStatus.OK)
    async initiateGoogleAuth(@Claims() user: JwtPayload) {
        const result = await this.googleCalendarService.initiateGoogleAuth(
            user['tenantId'],
            user['sub'],
        );
        return handleServiceResponse(result);
    }

    @Public()
    @Get('callback')
    @HttpCode(HttpStatus.OK)
    async handleGoogleCallback(
        @Query('state') state: string,
        @Query('code') code: string,
        @Res() res: Response,
    ) {
        const [, ok] = await this.googleCalendarService.handleGoogleCallback(
            code,
            state,
        );
        const redirectUrl = new URL(`${this.frontendUrl}/dashboard/interviews`);

        redirectUrl.searchParams.set('google_connected', ok ? 'true' : 'false');

        return res.redirect(302, redirectUrl.toString());
    }
}
