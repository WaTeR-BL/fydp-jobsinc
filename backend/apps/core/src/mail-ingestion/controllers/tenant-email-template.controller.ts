import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Put,
} from '@nestjs/common';
import { Claims } from '../../common/decorators/claims.decorator';
import { JwtPayload } from '../../auth/types/jwt-payload.type';
import { RequireTenant } from '../../common/decorators/require-tenant.decorator';
import { handleServiceResponse } from '../../common/helper/response-handler.helper';
import { TenantEmailTemplateService } from '../services/tenant-email-template.service';
import { TemplateParamDto, UpsertEmailTemplateDto } from '../dto/tenant-email-template.dto';

@Controller('mail-ingestion/email-templates')
@RequireTenant()
export class TenantEmailTemplateController {
    constructor(private readonly service: TenantEmailTemplateService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    async getAll(@Claims() user: JwtPayload) {
        return handleServiceResponse(
            await this.service.getAll(user['tenantId']),
        );
    }

    @Get(':type')
    @HttpCode(HttpStatus.OK)
    async getOne(@Param('type') type: string, @Claims() user: JwtPayload) {
        return handleServiceResponse(
            await this.service.getOne(user['tenantId'], type),
        );
    }

    @Put(':type')
    async upsert(
        @Param() params: TemplateParamDto,
        @Body() dto: UpsertEmailTemplateDto,
        @Claims() user: JwtPayload,
    ) {
        return handleServiceResponse(
            await this.service.upsert(user['tenantId'], params.type, dto),
        );
    }

    @Delete(':type')
    @HttpCode(HttpStatus.OK)
    async remove(@Param('type') type: string, @Claims() user: JwtPayload) {
        return handleServiceResponse(
            await this.service.remove(user['tenantId'], type),
        );
    }
}
