import { EmailTemplate } from '@app/common/enums/app.enums';
import { Type } from 'class-transformer';
import {
    IsDate,
    IsIn,
    IsISO8601,
    IsNotEmpty,
    IsOptional,
    ValidateIf,
} from 'class-validator';
import { HasTimezone } from '../../common/validator/timezone.validator';

export class SendEmailDto {
    @IsOptional()
    feedback?: string;

    @IsIn([EmailTemplate.ACCEPT, EmailTemplate.REJECT])
    emailType: EmailTemplate;

    @ValidateIf((o) => o.emailType === EmailTemplate.ACCEPT)
    @IsNotEmpty()
    @IsISO8601()
    startDate?: string;

    @ValidateIf((o) => o.emailType === EmailTemplate.ACCEPT)
    @IsNotEmpty()
    salary?: string;
}
