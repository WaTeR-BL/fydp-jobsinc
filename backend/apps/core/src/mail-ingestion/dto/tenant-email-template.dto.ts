import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { EmailTemplate } from '@app/common/enums/app.enums';

export const CUSTOMIZABLE_TEMPLATES: string[] = [
    EmailTemplate.ACCEPT,
    EmailTemplate.REJECT,
    EmailTemplate.INTERVIEW,
    EmailTemplate.INTERVIEW_ASSIGNMENT,
];

export class UpsertEmailTemplateDto {
    @IsString()
    @IsNotEmpty()
    subject: string;

    @IsString()
    @IsNotEmpty()
    htmlContent: string;
}

export class TemplateParamDto {
    @IsString()
    @IsIn(CUSTOMIZABLE_TEMPLATES, {
        message: `templateType must be one of: ${CUSTOMIZABLE_TEMPLATES.join(', ')}`,
    })
    type: string;
}