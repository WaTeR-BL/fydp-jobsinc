import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
} from '@nestjs/common';
import { DomainService } from './domain.service';
import {
    CreateDomainDto,
    DomainFilterDto,
    UpdateDomainDto,
} from './dto/domain.dto';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { Claims } from '../common/decorators/claims.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { RequireTenant } from '../common/decorators/require-tenant.decorator';

@Controller('domains')
@RequireTenant()
export class DomainController {
    constructor(private readonly domainService: DomainService) {}

    @Post()
    @HttpCode(HttpStatus.OK)
    async create(@Body() dto: CreateDomainDto, @Claims() user: JwtPayload) {
        const result = await this.domainService.create(
            dto,
            user['tenantId'],
            user['sub'],
        );
        return handleServiceResponse(result);
    }

    @Post('filter')
    @HttpCode(HttpStatus.OK)
    async getAll(@Body() dto: DomainFilterDto, @Claims() user: JwtPayload) {
        const result = await this.domainService.getAll(dto, user['tenantId']);
        return handleServiceResponse(result);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async getById(@Param('id') id: string, @Claims() user: JwtPayload) {
        const result = await this.domainService.getById(id, user['tenantId']);
        return handleServiceResponse(result);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string, @Claims() user: JwtPayload) {
        const result = await this.domainService.delete(
            id,
            user['tenantId'],
            user['sub'],
        );
        return handleServiceResponse(result);
    }

    @Put(':id')
    @HttpCode(HttpStatus.OK)
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateDomainDto,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.domainService.update(
            id,
            user['tenantId'],
            dto,
            user['sub'],
        );
        return handleServiceResponse(result);
    }
}
