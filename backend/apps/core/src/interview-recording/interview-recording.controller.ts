import {
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
    HttpCode,
    HttpStatus,
    Get,
    Param,
    Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InterviewRecordingService } from './interview-recording.service';
import { UploadInterviewDto } from './dto/upload-interview.dto';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { ParseFormData } from '../common/decorators/parse-form-data.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('interview-recordings')
export class InterviewRecordingController {
    constructor(
        private readonly interviewRecordingService: InterviewRecordingService,
    ) {}

    @Public()
    @Get('validate/:jobVerificationCode')
    @HttpCode(HttpStatus.OK)
    async validateCode(
        @Param('jobVerificationCode') code: string,
        @Query('interviewId') interviewId?: string,
    ) {
        const result =
            await this.interviewRecordingService.validateJobVerificationCode(
                code,
                interviewId,
            );
        return handleServiceResponse(result);
    }

    @Public() // No authentication required - uses applicantInterviewId instead
    @Post('upload')
    @HttpCode(HttpStatus.ACCEPTED) // 202 - processing asynchronously
    @UseInterceptors(FileInterceptor('file'))
    async uploadRecording(
        @ParseFormData(UploadInterviewDto) dto: UploadInterviewDto,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const result = await this.interviewRecordingService.handleUpload(
            dto,
            file,
        );
        return handleServiceResponse(result);
    }

    @Get(':id')
    async getRecording(@Param('id') id: string) {
        const result = await this.interviewRecordingService.getRecording(id);
        return handleServiceResponse(result);
    }

    @Get('by-interview/:applicantInterviewId')
    async getRecordingsByInterview(
        @Param('applicantInterviewId') applicantInterviewId: string,
    ) {
        const result =
            await this.interviewRecordingService.getRecordingsByInterview(
                applicantInterviewId,
            );
        return handleServiceResponse(result);
    }
}
