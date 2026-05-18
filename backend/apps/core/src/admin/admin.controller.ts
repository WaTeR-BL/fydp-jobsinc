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
import { AdminService } from './admin.service';
import { SuperAdmin } from '../common/decorators/super-admin.decorator';
import { Claims } from '../common/decorators/claims.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import {
    CreateAdminUserDto,
    TenantFilterDto,
    ToggleWhatsappManagedDto,
    UpdateAdminUserStatusDto,
    UpdateBusinessIdDto,
    UpdateTenantStatusDto,
} from './dto/admin.dto';

@Controller('admin')
@SuperAdmin()
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get('dashboard')
    @HttpCode(HttpStatus.OK)
    async getDashboard() {
        const result = await this.adminService.getPlatformDashboard();
        return handleServiceResponse(result);
    }

    @Get('tenants')
    @HttpCode(HttpStatus.OK)
    async getTenants(@Query() dto: TenantFilterDto) {
        const result = await this.adminService.getTenants(dto);
        return handleServiceResponse(result);
    }

    @Get('tenants/:id')
    @HttpCode(HttpStatus.OK)
    async getTenantById(@Param('id') id: string) {
        const result = await this.adminService.getTenantById(id);
        return handleServiceResponse(result);
    }

    @Patch('tenants/:id/status')
    @HttpCode(HttpStatus.OK)
    async updateTenantStatus(
        @Param('id') id: string,
        @Body() dto: UpdateTenantStatusDto,
    ) {
        const result = await this.adminService.updateTenantStatus(id, dto);
        return handleServiceResponse(result);
    }

    @Patch('tenants/:id/business-id')
    @HttpCode(HttpStatus.OK)
    async updateTenantBusinessId(
        @Param('id') id: string,
        @Body() dto: UpdateBusinessIdDto,
    ) {
        const result = await this.adminService.updateTenantBusinessId(id, dto);
        return handleServiceResponse(result);
    }

    @Patch('tenants/:id/whatsapp-managed')
    @HttpCode(HttpStatus.OK)
    async toggleWhatsappManaged(
        @Param('id') id: string,
        @Body() dto: ToggleWhatsappManagedDto,
    ) {
        const result = await this.adminService.toggleWhatsappManaged(id, dto);
        return handleServiceResponse(result);
    }

    @Get('users')
    @HttpCode(HttpStatus.OK)
    async getAdminUsers() {
        const result = await this.adminService.getAdminUsers();
        return handleServiceResponse(result);
    }

    @Post('users')
    @HttpCode(HttpStatus.CREATED)
    async createAdminUser(@Body() dto: CreateAdminUserDto) {
        const result = await this.adminService.createAdminUser(dto);
        return handleServiceResponse(result);
    }

    @Patch('users/:id/status')
    @HttpCode(HttpStatus.OK)
    async updateAdminUserStatus(
        @Param('id') id: string,
        @Body() dto: UpdateAdminUserStatusDto,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.adminService.updateAdminUserStatus(
            id,
            dto,
            user.sub,
        );
        return handleServiceResponse(result);
    }
}
