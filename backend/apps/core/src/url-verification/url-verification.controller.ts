import { Controller, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { UrlVerificationService } from './url-verification.service';
import { RequireTenant } from '../common/decorators/require-tenant.decorator';

@Controller('url')
@RequireTenant()
export class UrlVerificationController {
    constructor(
        private readonly urlVerificationService: UrlVerificationService,
    ) {}

    @Public()
    @Post('verification')
    @HttpCode(HttpStatus.OK)
    async verification(@Query('url') url: string) {
        const result = await this.urlVerificationService.verify(url);
        return handleServiceResponse(result);
    }
}
