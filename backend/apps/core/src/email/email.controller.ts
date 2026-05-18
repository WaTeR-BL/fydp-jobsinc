import { Controller, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
    constructor(private readonly emailService: EmailService) {}

    @Public()
    @Post('verification')
    @HttpCode(HttpStatus.OK)
    async verification(@Query('email') email: string) {
        const result = await this.emailService.verify(email);
        return handleServiceResponse(result);
    }
}
