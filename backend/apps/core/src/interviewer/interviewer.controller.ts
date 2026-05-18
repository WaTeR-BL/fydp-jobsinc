import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
} from '@nestjs/common';
import { InterviewerService } from './interviewer.service';
import { CreateTimeSlotDto } from './dto/interviewer.dto';
import { Claims } from '../common/decorators/claims.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { RequireTenant } from '../common/decorators/require-tenant.decorator';

@Controller('interviewers')
@RequireTenant()
export class InterviewerController {
    constructor(private readonly interviewerService: InterviewerService) {}

    @Post('time-slots')
    @HttpCode(HttpStatus.OK)
    async create(@Body() dto: CreateTimeSlotDto[], @Claims() user: JwtPayload) {
        const result = await this.interviewerService.create(
            user['tenantId'],
            user['sub'],
            dto,
            user['timezone'],
        );
        return handleServiceResponse(result);
    }

    @Post('time-slots/:id')
    @HttpCode(HttpStatus.OK)
    async add(
        @Param('id') id: string,
        @Body() dto: CreateTimeSlotDto[],
        @Claims() user: JwtPayload,
    ) {
        const result = await this.interviewerService.addTimeSlots(
            id,
            user['tenantId'],
            dto,
            user['timezone'],
        );
        return handleServiceResponse(result);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    async get(@Claims() user: JwtPayload) {
        const result = await this.interviewerService.get(
            user['sub'],
            user['tenantId'],
            user['timezone'],
        );
        return handleServiceResponse(result);
    }

    @Get(':id/applicant/time-slots')
    @HttpCode(HttpStatus.OK)
    async availableTimeSlots(
        @Param('id') id: string,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.interviewerService.getAvailableSlots(
            id,
            user['timezone'],
        );
        return handleServiceResponse(result);
    }

    @Get('tenant/time-slots')
    @HttpCode(HttpStatus.OK)
    async tenantInterviewers(@Claims() user: JwtPayload) {
        const result = await this.interviewerService.getAll(user['tenantId']);
        return handleServiceResponse(result);
    }

    @Get('reserved-time-slots')
    @HttpCode(HttpStatus.OK)
    async reservedTimeSlots(@Claims() user: JwtPayload) {
        const result = await this.interviewerService.reservedTimeSlots(
            user['sub'],
            user['tenantId'],
        );
        return handleServiceResponse(result);
    }
}
