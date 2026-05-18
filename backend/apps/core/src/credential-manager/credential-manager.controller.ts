import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Put,
    Query,
} from '@nestjs/common';
import { Claims } from '../common/decorators/claims.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { CredentialManagerService } from './credential-manager.service';
import { RevokeLinkedInCredentialsDto } from './dto/credential-manager.dto';
import { AccountsQueryDto } from '../job-posting/dto/job-posting.dto';
import { RequireTenant } from '../common/decorators/require-tenant.decorator';

@Controller('credential-manager')
@RequireTenant()
export class CredentialManagerController {
    constructor(
        private readonly credentialManagerService: CredentialManagerService,
    ) {}

    @Put('revoke/google-credentials')
    @HttpCode(HttpStatus.OK)
    async revokeGoogleCredential(@Claims() user: JwtPayload) {
        const result =
            await this.credentialManagerService.revokeGoogleCredentials(
                user['tenantId'],
                user['sub'],
            );
        return handleServiceResponse(result);
    }

    @Put('revoke/linkedin-credentials')
    @HttpCode(HttpStatus.OK)
    async revokeLinkedinCredential(
        @Body() dto: RevokeLinkedInCredentialsDto,
        @Claims() user: JwtPayload,
    ) {
        const result =
            await this.credentialManagerService.revokeLinkedInCredentials(
                user['tenantId'],
                dto.emails,
            );
        return handleServiceResponse(result);
    }

    @Get('linkedin/accounts')
    @HttpCode(HttpStatus.OK)
    async getLinkedInAccounts(
        @Query() query: AccountsQueryDto,
        @Claims() user: JwtPayload,
    ) {
        const isExpired =
            query.isExpired === undefined ? null : query.isExpired === 'true';

        const result = await this.credentialManagerService.getLinkedInAccounts(
            user['tenantId'],
            isExpired,
            user['timezone'],
        );
        return handleServiceResponse(result);
    }

    @Get('google/accounts')
    @HttpCode(HttpStatus.OK)
    async getGoogleAccounts(@Claims() user: JwtPayload) {
        const result =
            await this.credentialManagerService.GetGoogleCalenderStatus(
                user['tenantId'],
                user['sub'],
            );
        return handleServiceResponse(result);
    }
}
