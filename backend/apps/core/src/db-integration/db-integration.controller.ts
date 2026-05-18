import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { Claims } from '../common/decorators/claims.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { RequireTenant } from '../common/decorators/require-tenant.decorator';
import { IntegrationConfigService } from './services/integration-config.service';
import { IntegrationSyncService } from './services/integration-sync.service';
import { ReferenceDataService } from './services/reference-data.service';
import {
    GetExecutionsDto,
    TestConnectionDto,
    ToggleActiveDto,
    UpsertIntegrationConfigDto,
} from './dto/integration-config.dto';

@Controller('db-integration')
@RequireTenant()
export class DbIntegrationController {
    constructor(
        private readonly configService: IntegrationConfigService,
        private readonly syncService: IntegrationSyncService,
        private readonly refDataService: ReferenceDataService,
    ) {}

    // ── Config ────────────────────────────────────────────────────────────────

    @Post('config')
    @HttpCode(HttpStatus.OK)
    async upsertConfig(
        @Body() dto: UpsertIntegrationConfigDto,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.configService.upsert(user['tenantId'], dto);
        return handleServiceResponse(result);
    }

    @Get('config')
    @HttpCode(HttpStatus.OK)
    async getConfig(@Claims() user: JwtPayload) {
        const result = await this.configService.getForTenant(user['tenantId']);
        return handleServiceResponse(result);
    }

    /**
     * Returns the list of extra fields the HR must fill when marking a candidate as hired.
     * Frontend calls this before showing the hire confirmation dialog.
     */
    @Get('config/required-fields')
    @HttpCode(HttpStatus.OK)
    async getRequiredFields(@Claims() user: JwtPayload) {
        const result = await this.configService.getRequiredExtraFields(
            user['tenantId'],
        );
        return handleServiceResponse(result);
    }

    /**
     * Returns both scalar extra fields and relation definitions for the hire dialog.
     * Relations require array-type inputs (certifications, skills, etc.)
     */
    @Get('config/hire-schema')
    @HttpCode(HttpStatus.OK)
    async getHireSchema(@Claims() user: JwtPayload) {
        const result = await this.configService.getHireSchema(user['tenantId']);
        return handleServiceResponse(result);
    }

    // ── Reference Data ─────────────────────────────────────────────────────────

    @Post('reference-data/sync')
    @HttpCode(HttpStatus.OK)
    async syncAllRefData(@Claims() user: JwtPayload) {
        const result = await this.refDataService.syncAll(user['tenantId']);
        return handleServiceResponse(result);
    }

    @Post('reference-data/sync/:tableKey')
    @HttpCode(HttpStatus.OK)
    async syncRefTable(
        @Param('tableKey') tableKey: string,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.refDataService.syncTable(
            user['tenantId'],
            tableKey,
        );
        return handleServiceResponse(result);
    }

    @Get('reference-data')
    @HttpCode(HttpStatus.OK)
    async listRefTables(@Claims() user: JwtPayload) {
        const result = await this.refDataService.listRefTables(
            user['tenantId'],
        );
        return handleServiceResponse(result);
    }

    @Get('reference-data/:tableKey')
    @HttpCode(HttpStatus.OK)
    async getRefData(
        @Param('tableKey') tableKey: string,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.refDataService.getRefData(
            user['tenantId'],
            tableKey,
        );
        return handleServiceResponse(result);
    }

    @Patch('config/toggle')
    @HttpCode(HttpStatus.OK)
    async toggleActive(
        @Body() dto: ToggleActiveDto,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.configService.toggleActive(
            user['tenantId'],
            dto,
        );
        return handleServiceResponse(result);
    }

    @Post('config/test-connection')
    @HttpCode(HttpStatus.OK)
    async testConnection(@Body() dto: TestConnectionDto) {
        const result = await this.configService.testConnection(dto);
        return handleServiceResponse(result);
    }

    // ── Executions ────────────────────────────────────────────────────────────

    @Get('executions')
    @HttpCode(HttpStatus.OK)
    async getExecutions(
        @Query() query: GetExecutionsDto,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.syncService.getExecutions(
            user['tenantId'],
            query.status,
            query.page ?? 1,
            query.limit ?? 10,
        );
        return handleServiceResponse(result);
    }

    @Get('executions/:id')
    @HttpCode(HttpStatus.OK)
    async getExecution(@Param('id') id: string, @Claims() user: JwtPayload) {
        const result = await this.syncService.getExecution(
            id,
            user['tenantId'],
        );
        return handleServiceResponse(result);
    }

    @Post('executions/:id/retry')
    @HttpCode(HttpStatus.OK)
    async retryExecution(@Param('id') id: string, @Claims() user: JwtPayload) {
        const result = await this.syncService.retryExecution(
            id,
            user['tenantId'],
        );
        return handleServiceResponse(result);
    }
}
