import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import { Claims } from '../../common/decorators/claims.decorator';
import { JwtPayload } from '../../auth/types/jwt-payload.type';
import { RequireTenant } from '../../common/decorators/require-tenant.decorator';
import { handleServiceResponse } from '../../common/helper/response-handler.helper';
import { MailboxConfigService } from '../services/mailbox-config.service';
import {
    TestMailboxDto,
    ToggleMailboxDto,
    UpsertMailboxConfigDto,
} from '../dto/mailbox-config.dto';

@Controller('mail-ingestion/mailbox')
@RequireTenant()
export class MailboxConfigController {
    constructor(private readonly service: MailboxConfigService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    async get(@Claims() user: JwtPayload) {
        return handleServiceResponse(
            await this.service.getForTenant(user['tenantId']),
        );
    }

    @Post('test')
    @HttpCode(HttpStatus.OK)
    async test(@Body() dto: TestMailboxDto) {
        return handleServiceResponse(await this.service.testConnection(dto));
    }

    @Post()
    @HttpCode(HttpStatus.OK)
    async upsert(
        @Body() dto: UpsertMailboxConfigDto,
        @Claims() user: JwtPayload,
    ) {
        return handleServiceResponse(
            await this.service.upsert(user['tenantId'], dto),
        );
    }

    @Put()
    @HttpCode(HttpStatus.OK)
    async update(
        @Body() dto: UpsertMailboxConfigDto,
        @Claims() user: JwtPayload,
    ) {
        return handleServiceResponse(
            await this.service.upsert(user['tenantId'], dto),
        );
    }

    @Patch('toggle')
    @HttpCode(HttpStatus.OK)
    async toggle(@Body() dto: ToggleMailboxDto, @Claims() user: JwtPayload) {
        return handleServiceResponse(
            await this.service.toggle(user['tenantId'], dto),
        );
    }

    @Delete()
    @HttpCode(HttpStatus.OK)
    async remove(@Claims() user: JwtPayload) {
        return handleServiceResponse(
            await this.service.remove(user['tenantId']),
        );
    }
}
