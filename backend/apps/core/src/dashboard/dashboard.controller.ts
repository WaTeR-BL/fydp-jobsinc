import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { Claims } from '../common/decorators/claims.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { DashboardService } from './dasboard.service';

@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    async getAll(@Claims() user: JwtPayload) {
        const result = await this.dashboardService.getDashboardData(
            user['tenantId'],
        );
        return handleServiceResponse(result);
    }
}
