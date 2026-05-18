import {
    BadRequestException,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { AccountProvisioningService } from './account-provisioning.service';
import { TenantOnboardingDto } from './dto/account-provisioning.dto';
import { Public } from '../common/decorators/public.decorator';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseFormData } from '../common/decorators/parse-form-data.decorator';

@Controller('account-provisioning')
export class AccountProvisioningController {
    constructor(
        private readonly accountProvisioningService: AccountProvisioningService,
    ) {}

    @Public()
    @Post('tenant-onboarding')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(
        FileInterceptor('logo', {
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.startsWith('image/')) {
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
    async tenantOnboarding(
        @ParseFormData(TenantOnboardingDto) dto: TenantOnboardingDto,
        @UploadedFile() logo: Express.Multer.File,
    ) {
        const result = await this.accountProvisioningService.tenantOnboarding(
            dto,
            logo,
        );
        return handleServiceResponse(result);
    }
}
