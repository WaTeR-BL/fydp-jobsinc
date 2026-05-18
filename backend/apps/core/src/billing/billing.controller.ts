import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Headers,
    HttpCode,
    HttpStatus,
    Req,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { WebhookService } from './webhook.service';
import { SubscriptionGuardService } from './subscription-guard.service';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { Claims } from '../common/decorators/claims.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RequireTenant } from '../common/decorators/require-tenant.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import {
    CreateCheckoutSessionDto,
    CreatePortalSessionDto,
    ChangePlanDto,
} from './dto/billing.dto';

@Controller('billing')
@RequireTenant()
export class BillingController {
    constructor(
        private readonly paymentService: PaymentService,
        private readonly webhookService: WebhookService,
        private readonly subscriptionGuardService: SubscriptionGuardService,
    ) {}

    @Post('checkout')
    @HttpCode(HttpStatus.OK)
    async createCheckoutSession(
        @Body() dto: CreateCheckoutSessionDto,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.paymentService.createCheckoutSession(
            user['tenantId'],
            dto.priceId,
            dto.successUrl,
            dto.cancelUrl,
            dto.addonPriceIds,
        );
        return handleServiceResponse(result as [string, boolean, any]);
    }

    @Post('portal')
    @HttpCode(HttpStatus.OK)
    async createPortalSession(
        @Body() dto: CreatePortalSessionDto,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.paymentService.createPortalSession(
            user['tenantId'],
            dto.returnUrl,
        );
        return handleServiceResponse(result as [string, boolean, any]);
    }

    @Get('subscription')
    @HttpCode(HttpStatus.OK)
    async getSubscription(@Claims() user: JwtPayload) {
        const sub = await this.subscriptionGuardService.getActiveSubscription(
            user['tenantId'],
        );
        return sub ?? null;
    }

    @Post('cancel')
    @HttpCode(HttpStatus.OK)
    async cancelSubscription(@Claims() user: JwtPayload) {
        const result = await this.paymentService.cancelAtPeriodEnd(
            user['tenantId'],
        );
        return handleServiceResponse(result);
    }

    @Post('change-plan')
    @HttpCode(HttpStatus.OK)
    async changePlan(@Body() dto: ChangePlanDto, @Claims() user: JwtPayload) {
        const result = await this.paymentService.changePlan(
            user['tenantId'],
            dto.priceId,
            dto.isUpgrade,
        );
        return handleServiceResponse(result);
    }

    @Post('addon/whatsapp-managed')
    @HttpCode(HttpStatus.OK)
    async addWhatsappAddon(@Claims() user: JwtPayload) {
        const result = await this.paymentService.addWhatsappManagedAddon(
            user['tenantId'],
        );
        return handleServiceResponse(result);
    }

    @Delete('addon/whatsapp-managed')
    @HttpCode(HttpStatus.OK)
    async removeWhatsappAddon(@Claims() user: JwtPayload) {
        const result = await this.paymentService.removeWhatsappManagedAddon(
            user['tenantId'],
        );
        return handleServiceResponse(result);
    }

    @Post('webhook')
    @Public()
    @HttpCode(HttpStatus.OK)
    async handleWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('stripe-signature') sig: string,
    ) {
        const event = this.webhookService.constructAndSave(req.rawBody, sig);
        await this.webhookService.processEvent(event);
        return { received: true };
    }
}
