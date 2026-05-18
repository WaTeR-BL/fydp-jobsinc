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
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { JobService } from './job.service';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import {
    CreateInterviewRoundConfigDto,
    CreateJobDto,
    CreateMetricDto,
    JobFilterDto,
    UpdateInterviewRoundConfigDto,
    UpdateJobDto,
    UpdateMetricDto,
    UpdatePostDataDto,
} from './dto/job.dto';
import { ApplicationChannel } from '@app/common/enums/app.enums';
import { FileInterceptor } from '@nestjs/platform-express';
import { Claims } from '../common/decorators/claims.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { ParseFormData } from '../common/decorators/parse-form-data.decorator';
import { RequireTenant } from '../common/decorators/require-tenant.decorator';

@Controller('jobs')
@RequireTenant()
export class JobController {
    constructor(private readonly jobService: JobService) {}

    @Post()
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('file'))
    async create(
        @ParseFormData(CreateJobDto) dto: CreateJobDto,
        @UploadedFile() file: Express.Multer.File,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.jobService.create(
            dto,
            file,
            user['tenantId'],
            user['timezone'],
            user['sub'],
        );
        return handleServiceResponse(result);
    }

    @Post('analyze-jd')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('file'))
    async analyze(@UploadedFile() file: Express.Multer.File) {
        const result = await this.jobService.analyze(file);
        return handleServiceResponse(result);
    }

    @Post('generate-linkedin-post')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('file'))
    async generateLinkedinPost(
        @UploadedFile() file: Express.Multer.File,
        @Body('channels') rawChannels: string,
        @Body('jobVerificationCode') jobVerificationCode: string,
        @Claims() user: JwtPayload,
    ) {
        const channels = (rawChannels ?? '')
            .split(',')
            .map((c) => c.trim())
            .filter((c): c is ApplicationChannel =>
                Object.values(ApplicationChannel).includes(
                    c as ApplicationChannel,
                ),
            );

        const result = await this.jobService.generateLinkedinPost(
            file,
            user['tenantId'],
            channels.length ? channels : [ApplicationChannel.WHATSAPP],
            jobVerificationCode ?? '',
        );
        return handleServiceResponse(result);
    }

    @Put(':jobId/post-data')
    @HttpCode(HttpStatus.OK)
    async updatePostData(
        @Param('jobId') jobId: string,
        @Body() dto: UpdatePostDataDto,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.jobService.updatePostData(
            jobId,
            user['tenantId'],
            dto,
        );
        return handleServiceResponse(result);
    }

    @Post('filter')
    @HttpCode(HttpStatus.OK)
    async getAll(@Body() dto: JobFilterDto, @Claims() user: JwtPayload) {
        const result = await this.jobService.getAll(
            dto,
            user['tenantId'],
            user['timezone'],
        );
        return handleServiceResponse(result);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async getById(@Param('id') id: string, @Claims() user: JwtPayload) {
        const result = await this.jobService.getById(
            id,
            user['tenantId'],
            user['timezone'],
        );
        return handleServiceResponse(result);
    }

    @Get(':id/close')
    @HttpCode(HttpStatus.OK)
    async closeJob(@Param('id') id: string, @Claims() user: JwtPayload) {
        const result = await this.jobService.manuallyCloseJob(
            id,
            user['tenantId'],
            user['sub'],
        );
        return handleServiceResponse(result);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string, @Claims() user: JwtPayload) {
        const result = await this.jobService.delete(
            id,
            user['tenantId'],
            user['sub'],
        );
        return handleServiceResponse(result);
    }

    @Put(':id')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(
        FileInterceptor('file', {
            fileFilter: (req, file, callback) => {
                if (!file) {
                    return callback(null, true);
                }

                callback(null, true);
            },
        }),
    )
    async updateJob(
        @Param('id') id: string,
        @Body() dto: UpdateJobDto,
        @Claims() user: JwtPayload,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        const result = await this.jobService.updateJob(
            id,
            dto,
            user['tenantId'],
            user['timezone'],
            file || null,
            user['sub'],
        );
        return handleServiceResponse(result);
    }

    @Post(':jobId/metrics')
    @HttpCode(HttpStatus.OK)
    async addMetric(
        @Param('jobId') id: string,
        @Body() dto: CreateMetricDto[],
        @Claims() user: JwtPayload,
    ) {
        const result = await this.jobService.addMetric(
            id,
            dto,
            user['tenantId'],
            user['sub'],
        );
        return handleServiceResponse(result);
    }

    @Post(':jobId/pipeline')
    @HttpCode(HttpStatus.OK)
    async savePipeline(
        @Param('jobId') id: string,
        @Body() dto: CreateInterviewRoundConfigDto[],
        @Claims() user: JwtPayload,
    ) {
        const result = await this.jobService.savePipeline(
            id,
            dto,
            user['tenantId'],
            user['sub'],
        );
        return handleServiceResponse(result);
    }

    @Put(':jobId/metrics')
    @HttpCode(HttpStatus.OK)
    async updateMetric(
        @Param('jobId') id: string,
        @Body() dto: UpdateMetricDto[],
        @Claims() user: JwtPayload,
    ) {
        const result = await this.jobService.updateMetric(
            id,
            dto,
            user['tenantId'],
            user['sub'],
        );
        return handleServiceResponse(result);
    }

    @Put(':jobId/pipeline')
    @HttpCode(HttpStatus.OK)
    async updatePipeline(
        @Param('jobId') id: string,
        @Body() dto: UpdateInterviewRoundConfigDto[],
        @Claims() user: JwtPayload,
    ) {
        const result = await this.jobService.updatePipeline(
            id,
            dto,
            user['tenantId'],
            user['sub'],
        );
        return handleServiceResponse(result);
    }
}
