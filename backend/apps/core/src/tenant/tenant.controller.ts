import {
    Controller,
    Post,
    HttpException,
    HttpStatus,
    UseInterceptors,
    UploadedFile,
    HttpCode,
    Delete,
    BadRequestException,
    Put,
    Patch,
    Get,
    Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TenantService } from './tenant.service';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { Claims } from '../common/decorators/claims.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Public } from '../common/decorators/public.decorator';
import { ParseFormData } from '../common/decorators/parse-form-data.decorator';
import {
    UpdateTenantDto,
    WhatsappConfigDto,
    WhatsappNumberDto,
} from './dto/tenant.dto';
import { RequireTenant } from '../common/decorators/require-tenant.decorator';

@Controller('tenant')
@RequireTenant()
export class TenantController {
    constructor(private readonly tenantService: TenantService) {}

    @Post('upload-pdf')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('file'))
    async uploadTenantPdf(
        @UploadedFile() file: Express.Multer.File,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.tenantService.uploadAndEmbedTenantPdf(
            user['tenantId'],
            file,
        );
        return handleServiceResponse(result);
    }

    @Public()
    @Delete('delete-knowledge')
    @HttpCode(HttpStatus.OK)
    async deleteJobsincKnowledge(): Promise<{
        message: string;
        success: boolean;
    }> {
        try {
            await this.tenantService.deleteJobsincKnowledge();

            return {
                message: 'Jobsinc knowledge deleted successfully',
                success: true,
            };
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to delete Jobsinc knowledge',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Patch('whatsapp-config')
    @HttpCode(HttpStatus.OK)
    async saveWhatsappConfig(
        @Body() dto: WhatsappConfigDto,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.tenantService.saveWhatsappConfig(
            user['tenantId'],
            dto,
        );
        return handleServiceResponse(result);
    }

    @Patch('whatsapp-number')
    @HttpCode(HttpStatus.OK)
    async saveLiveContact(
        @Body() dto: WhatsappNumberDto,
        @Claims() user: JwtPayload,
    ) {
        const result = await this.tenantService.saveLiveContact(
            user['tenantId'],
            dto,
        );
        return handleServiceResponse(result);
    }

    @Get('whatsapp-config')
    @HttpCode(HttpStatus.OK)
    async getWhatsappConfig(@Claims() user: JwtPayload) {
        const result = await this.tenantService.getWhatsappConfig(
            user['tenantId'],
        );
        return handleServiceResponse(result);
    }

    @Get('whatsapp-status')
    @HttpCode(HttpStatus.OK)
    async getWhatsappStatus(@Claims() user: JwtPayload) {
        const result = await this.tenantService.whatsappStatus(
            user['tenantId'],
        );
        return handleServiceResponse(result);
    }

    @Post('whatsapp-status/force')
    @HttpCode(HttpStatus.OK)
    async forceWhatsappHealthCheck(@Claims() user: JwtPayload) {
        const result = await this.tenantService.forceWhatsappHealthCheck(
            user['tenantId'],
        );
        return handleServiceResponse(result);
    }

    @Put()
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(
        FileInterceptor('logo', {
            fileFilter: (req, file, cb) => {
                if (file && !file.mimetype.startsWith('image/')) {
                    return cb(
                        new BadRequestException('Only image files are allowed'),
                        false,
                    );
                }
                cb(null, true);
            },
            limits: { fileSize: 5 * 1024 * 1024 },
        }),
    )
    async update(
        @ParseFormData(UpdateTenantDto) dto: UpdateTenantDto,
        @Claims() user: JwtPayload,
        @UploadedFile() logo?: Express.Multer.File,
    ) {
        const result = await this.tenantService.update(
            user['tenantId'],
            dto,
            logo,
        );
        return handleServiceResponse(result);
    }
}
