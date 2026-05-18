import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { PlanService } from './plan.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('plans')
export class PlanController {
    constructor(private readonly planService: PlanService) {}

    @Public()
    @Get()
    @HttpCode(HttpStatus.OK)
    async getById() {
        const result = await this.planService.getAll();
        return handleServiceResponse(result);
    }
}
