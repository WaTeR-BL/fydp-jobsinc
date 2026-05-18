import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { ApplicantJobFeedbackService } from './applicant-job-feedback.service';
import { Claims } from '../common/decorators/claims.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import {
    ApplicantDetailFilterDto,
    JobApplicantFilterDto,
} from './dto/applicant-job-feedback.dto';
import { SendEmailDto } from '../email/dto/email.dto';
import { RequireTenant } from '../common/decorators/require-tenant.decorator';

@Controller('applicant-job-feedbacks')
export class ApplicantJobFeedbackController {
    constructor(
        private readonly applicantJobFeedbackService: ApplicantJobFeedbackService,
    ) {}

    @Post(':jobId/filter')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async getAll(
        @Param('jobId') jobId: string,
        @Body() dto: JobApplicantFilterDto,
        @Claims() user: JwtPayload,
    ) {
        const result =
            await this.applicantJobFeedbackService.getAllJobApplicant(
                jobId,
                user['tenantId'],
                dto,
            );
        return handleServiceResponse(result);
    }

    @Get(':id')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async getById(@Param('id') id: string, @Claims() user: JwtPayload) {
        const result = await this.applicantJobFeedbackService.getJobApplicant(
            id,
            user['tenantId'],
        );
        return handleServiceResponse(result);
    }

    @Get(':id/evaluation')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async getEvaluation(@Param('id') id: string, @Claims() user: JwtPayload) {
        const result =
            await this.applicantJobFeedbackService.getInterviewEvaluation(
                id,
                user['tenantId'],
            );
        return handleServiceResponse(result);
    }

    @Post('email/:id')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async sendApplicantEmail(
        @Param('id') id: string,
        @Body() dto: SendEmailDto,
        @Claims() user: JwtPayload,
    ) {
        const result =
            await this.applicantJobFeedbackService.sendApplicantEmail(
                id,
                user['tenantId'],
                dto,
            );
        return handleServiceResponse(result);
    }

    @Put('interview-completion-status/:id')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async interviewCompletionStatus(@Param('id') id: string) {
        const result =
            await this.applicantJobFeedbackService.updateInterviewCompletion(
                id,
            );
        return handleServiceResponse(result);
    }

    @Post('applicant/details')
    @HttpCode(HttpStatus.OK)
    async getApplicantDetails(
        @Body() dto: ApplicantDetailFilterDto,
        @Claims() user: JwtPayload,
    ) {
        const result =
            await this.applicantJobFeedbackService.getApplicantDetails(
                user['sub'],
                dto,
                user['timezone'],
            );
        return handleServiceResponse(result);
    }

    @Post('applicant/details/summary')
    @HttpCode(HttpStatus.OK)
    async getApplicantDetailSummary(
        @Claims() user: JwtPayload,
        @Query('tenantId') tenantId?: string,
    ) {
        const result =
            await this.applicantJobFeedbackService.getApplicantSummary(
                user['sub'],
                tenantId,
            );
        return handleServiceResponse(result);
    }

    @Post('applicant/tenants')
    @HttpCode(HttpStatus.OK)
    async getApplicantTenants(@Claims() user: JwtPayload) {
        const result =
            await this.applicantJobFeedbackService.getApplicantTenantsList(
                user['sub'],
            );
        return handleServiceResponse(result);
    }
}
