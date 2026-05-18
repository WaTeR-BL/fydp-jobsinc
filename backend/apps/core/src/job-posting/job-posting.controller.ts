import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Query,
    UseInterceptors,
    Post,
    UploadedFiles,
    Res,
    Param,
    Body,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { JobPostingService } from './job-posting.service';
import {
    CreateLinkedInPostDto,
    CreatePostDto,
    JobPostDataDto,
} from './dto/job-posting.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ParseFormData } from '../common/decorators/parse-form-data.decorator';
import { Claims } from '../common/decorators/claims.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { ValidateFilesUploadPipe } from '../common/pipe/validate-file-upload.pipe';
import { Response } from 'express';
import { JobPostData } from '../job/interface/job.interface';
import { RequireTenant } from '../common/decorators/require-tenant.decorator';

@Controller('job-posting')
@RequireTenant()
export class JobPostingController {
    private readonly frontendUrl: string;
    constructor(
        private readonly jobPostingService: JobPostingService,
        private readonly config: ConfigService,
    ) {
        this.frontendUrl = this.config.get<string>('frontend.url');
    }

    @Get('linkedin/init')
    @HttpCode(HttpStatus.OK)
    async initiateLinkedInAuth(@Claims() user: JwtPayload) {
        const result = await this.jobPostingService.initiateLinkedInAuth(
            user['tenantId'],
        );
        return handleServiceResponse(result);
    }

    @Public()
    @Get('linkedin/callback')
    @HttpCode(HttpStatus.OK)
    async linkedInCallback(
        @Query('state') state: string,
        @Query('code') code: string,
        @Res() res: Response,
    ) {
        const [, ok] = await this.jobPostingService.handleLinkedInCallback(
            code,
            state,
        );
        return ok === true
            ? res.redirect(302, `${this.frontendUrl}/dashboard/jobs`)
            : res.redirect(302, `${this.frontendUrl}/dashboard/jobs`);
    }

    @Get('linkedin/status')
    @HttpCode(HttpStatus.OK)
    async checkLinkedInStatus(
        @Claims() user: JwtPayload,
        @Query('email') email?: string,
    ) {
        const result = await this.jobPostingService.checkLinkedInStatus(
            user['tenantId'],
            email,
        );

        return handleServiceResponse(result);
    }

    @Post('linkedin/posts/:jobId')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FilesInterceptor('media', 5))
    async createPost(
        @Param('jobId') jobId: string,
        @ParseFormData(CreateLinkedInPostDto) dto: CreateLinkedInPostDto,
        @UploadedFiles(new ValidateFilesUploadPipe())
        media: Express.Multer.File[],
        @Claims() user: JwtPayload,
    ) {
        const files =
            media?.map((file, index) => ({
                file,
                title: dto.mediaTitles?.[index],
                description: dto.mediaDescriptions?.[index],
            })) || [];

        const createPostDto: CreatePostDto = {
            text: dto.text,
            media: files.length > 0 ? files : undefined,
            visibility: dto.visibility,
            targetUrns: dto.targetUrns,
        };

        const result = await this.jobPostingService.createPost(
            jobId,
            createPostDto,
            user['tenantId'],
            user['timezone'],
        );

        return handleServiceResponse(result);
    }

    @Post('linkedin/retry/:jobId')
    @HttpCode(HttpStatus.OK)
    async retryFailedPosts(
        @Param('jobId') jobId: string,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.jobPostingService.retryFailedPosts(
            jobId,
            user['tenantId'],
            user['timezone'],
        );
        return handleServiceResponse(result);
    }

    @Post('linkedin/drafted-post/:jobId')
    @HttpCode(HttpStatus.OK)
    async postDraftedJob(
        @Param('jobId') jobId: string,
        @Body() dto: JobPostDataDto,
        @Claims() user: JwtPayload,
    ) {
        const body: JobPostData = {
            text: dto.text,
            media: dto.media,
            visibility: dto.visibility,
            targetUrns: dto.targetUrns,
            tenantId: user['tenantId'],
        };

        const result = await this.jobPostingService.postDraftedJob(
            jobId,
            body,
            user['timezone'],
        );

        return handleServiceResponse(result);
    }
}
