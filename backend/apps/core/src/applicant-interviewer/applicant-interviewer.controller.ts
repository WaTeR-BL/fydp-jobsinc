import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
} from '@nestjs/common';
import { ApplicantInterviewerService } from './applicant-interviewer.service';
import {
    AssignInterviewerDto,
    EventFilterDto,
    RejectCandidateDto,
    ScheduleInterviewDto,
    SkipRoundDto,
} from './dto/applicant-interviewer.dto';
import { HireCandidateDto } from '../db-integration/dto/integration-config.dto';
import { Claims } from '../common/decorators/claims.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { Public } from '../common/decorators/public.decorator';
import { RequireTenant } from '../common/decorators/require-tenant.decorator';

@Controller('applicant-interviewer')
export class ApplicantInterviewerController {
    constructor(
        private readonly applicantInterviewService: ApplicantInterviewerService,
    ) {}

    @Post('assign-interviewer')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async assignInterviewer(
        @Body() dto: AssignInterviewerDto,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.applicantInterviewService.assignInterviewer(
            dto,
            user['tenantId'],
            user['sub'],
        );
        return handleServiceResponse(result);
    }

    @Post('confirm')
    @HttpCode(HttpStatus.OK)
    async confirmTimeSlot(@Body() dto: ScheduleInterviewDto) {
        const result = await this.applicantInterviewService.confirmSlot(dto);
        return handleServiceResponse(result);
    }

    @Post('schedule/:id')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async scheduleInterview(@Param('id') id: string) {
        const result =
            await this.applicantInterviewService.scheduleInterview(id);
        return handleServiceResponse(result);
    }

    @Post('schedule/:id/:timeSlotId')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async changeTimeSlotId(
        @Param('id') id: string,
        @Param('timeSlotId') timeSlotId: string,
    ) {
        const result = await this.applicantInterviewService.changeInterviewSlot(
            id,
            timeSlotId,
        );
        return handleServiceResponse(result);
    }

    @Post('tenant/events')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async tenantEvent(
        @Body() filter: EventFilterDto,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.applicantInterviewService.events(
            user['tenantId'],
            filter,
            user['timezone'],
            filter.userId,
        );
        return handleServiceResponse(result);
    }

    @Post('tenant/user/events')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async userEvent(
        @Body() filter: EventFilterDto,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.applicantInterviewService.events(
            user['tenantId'],
            filter,
            user['timezone'],
            user['userId'],
        );
        return handleServiceResponse(result);
    }

    @Get('events/:id/details')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async eventDetail(@Param('id') id: string, @Claims() user: JwtPayload) {
        const result = await this.applicantInterviewService.eventDetail(
            id,
            user['timezone'],
        );
        return handleServiceResponse(result);
    }

    @Public()
    @Get('meeting-details/:meetingUrl')
    @HttpCode(HttpStatus.OK)
    async getMeetingDetails(@Param('meetingUrl') meetingUrl: string) {
        const result =
            await this.applicantInterviewService.getMeetingDetails(meetingUrl);
        return handleServiceResponse(result);
    }

    @Public()
    @Get('test/:id/:tenantId')
    @HttpCode(HttpStatus.OK)
    async test(@Param('id') id: string, @Param('tenantId') tenantId: string) {
        const result =
            await this.applicantInterviewService.extractInterviewHelperData(
                id,
                tenantId,
            );
        return handleServiceResponse(result);
    }

    @Post('advance/:feedbackId')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async advanceCandidate(
        @Param('feedbackId') feedbackId: string,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.applicantInterviewService.advanceCandidate(
            feedbackId,
            user['sub'],
        );
        return handleServiceResponse(result);
    }

    @Post('reject/:feedbackId')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async rejectCandidate(
        @Param('feedbackId') feedbackId: string,
        @Body() dto: RejectCandidateDto,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.applicantInterviewService.rejectCandidate(
            feedbackId,
            user['sub'],
            dto,
        );
        return handleServiceResponse(result);
    }

    @Post('skip-round/:feedbackId')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async skipRound(
        @Param('feedbackId') feedbackId: string,
        @Body() dto: SkipRoundDto,
    ) {
        const result = await this.applicantInterviewService.skipRound(
            feedbackId,
            dto,
        );
        return handleServiceResponse(result);
    }

    @Post('hire/:feedbackId')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async hireCandidate(
        @Param('feedbackId') feedbackId: string,
        @Body() dto: HireCandidateDto,
    ) {
        const result = await this.applicantInterviewService.hireCandidate(
            feedbackId,
            dto.extraData ?? {},
        );
        return handleServiceResponse(result);
    }

    @Get('pipeline/:feedbackId')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async getCandidatePipeline(@Param('feedbackId') feedbackId: string) {
        const result =
            await this.applicantInterviewService.getCandidatePipeline(
                feedbackId,
            );
        return handleServiceResponse(result);
    }

    /**
     * Retry the evaluation pipeline from the last successful checkpoint.
     *
     * Checkpoint 1 — transcription failed:
     *   Resets the recording to 'queued' and re-emits process-interview-audio.
     *
     * Checkpoint 2 — transcription succeeded but evaluation failed or never ran:
     *   Deletes any stale failed evaluation and re-emits evaluate-interview
     *   using the existing transcript + interview checklist snapshot.
     */
    @Post('retry-evaluation/:applicantInterviewId')
    @RequireTenant()
    @HttpCode(HttpStatus.OK)
    async retryEvaluationPipeline(
        @Param('applicantInterviewId') applicantInterviewId: string,
        @Claims() user: JwtPayload,
    ) {
        const result =
            await this.applicantInterviewService.retryEvaluationPipeline(
                applicantInterviewId,
                user['tenantId'],
            );
        return handleServiceResponse(result);
    }
}
