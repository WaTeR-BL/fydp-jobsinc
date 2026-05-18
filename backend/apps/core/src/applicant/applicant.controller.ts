import { Body, Controller, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { handleServiceResponse } from '../common/helper/response-handler.helper';
import { ApplicantService } from './applicant.service';
import { UpdateApplicantDto } from './dto/applicant.dto';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Claims } from '../common/decorators/claims.decorator';

@Controller('applicants')
export class ApplicantController {
    constructor(private readonly applicantService: ApplicantService) {}

    @Put()
    @HttpCode(HttpStatus.OK)
    async update(@Body() dto: UpdateApplicantDto, @Claims() user: JwtPayload) {
        const result = await this.applicantService.update(user['sub'], dto);
        return handleServiceResponse(result);
    }
}
