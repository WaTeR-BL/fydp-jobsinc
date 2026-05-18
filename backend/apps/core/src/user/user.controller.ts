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
    Query,
} from '@nestjs/common';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { UserService } from './user.service';
import {
    CreateUserDto,
    EmployeeFilterDto,
    ResetPasswordDto,
    Update2FAQueryDto,
    UpdateUserDto,
} from './dto/user.dto';
import { Claims } from '../common/decorators/claims.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { RequireTenant } from '../common/decorators/require-tenant.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post()
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async createUser(@Body() dto: CreateUserDto, @Claims() user: JwtPayload) {
        const result = await this.userService.createUser(
            dto,
            user['tenantId'],
            false,
        );
        return handleServiceResponse(result);
    }

    @Post('filter')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async getAll(@Body() dto: EmployeeFilterDto, @Claims() user: JwtPayload) {
        const result = await this.userService.getAllTenantEmployee(
            user['tenantId'],
            dto,
            user['timezone'],
        );
        return handleServiceResponse(result);
    }

    @Put('two-fa-status')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async update2FAStatus(
        @Query() query: Update2FAQueryDto,
        @Claims() user: JwtPayload,
    ) {
        const status = query.status === 'true';
        const result = await this.userService.update2FAStatus(
            user.sub,
            status,
            user['tenantId'],
            query.code,
        );
        return handleServiceResponse(result);
    }

    @Put(':id/reset-two-fa')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async reset2Fa(@Param('id') id: string, @Claims() user: JwtPayload) {
        const result = await this.userService.reset2Fa(id, user['tenantId']);
        return handleServiceResponse(result);
    }

    @Put()
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async updateUser(@Body() dto: UpdateUserDto, @Claims() user: JwtPayload) {
        const result = await this.userService.updateUser(
            user['sub'],
            dto,
            user['tenantId'],
        );
        return handleServiceResponse(result);
    }

    @Get(':id')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async getById(@Param('id') id: string, @Claims() user: JwtPayload) {
        const result = await this.userService.getById(
            id,
            user['tenantId'],
            user['timezone'],
        );
        return handleServiceResponse(result);
    }

    @Delete(':id')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string, @Claims() user: JwtPayload) {
        const result = await this.userService.delete(
            id,
            user['tenantId'],
            user['sub'],
        );
        return handleServiceResponse(result);
    }

    @Public()
    @Get('reset-password-request/:email')
    @HttpCode(HttpStatus.OK)
    async requestResetPassword(@Param('email') email: string) {
        const result = await this.userService.requestPasswordReset(email);
        return handleServiceResponse(result);
    }

    @Public()
    @Put('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() dto: ResetPasswordDto) {
        const result = await this.userService.resetPassword(dto);
        return handleServiceResponse(result);
    }
}
