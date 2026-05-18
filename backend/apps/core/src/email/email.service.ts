import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
    GetEmailAddressInsightsCommand,
    SendEmailCommand,
    SESv2Client,
} from '@aws-sdk/client-sesv2';
import {
    EmailVerificationResponse,
    SendEmail,
    SmtpConfig,
} from './interface/email.interface';
import { AuthUserType, InterviewType } from '@app/common/enums/app.enums';
import { RedisService } from '@app/common/redis/redis.service';
import {
    TenantEmailTemplate,
    TenantEmailTemplateDocument,
} from '@app/common/schemas/tenant-email-template.schema';
import {
    MailboxConfig,
    MailboxConfigDocument,
} from '@app/common/schemas/mailbox-config.schema';
import { MailEncryptionService } from '../mail-ingestion/services/mail-encryption.service';
import * as nodemailer from 'nodemailer';
import { TenantService } from '../tenant/tenant.service';
import axios from 'axios';

@Injectable()
export class EmailService implements OnModuleInit {
    private readonly logger = new Logger(EmailService.name);
    private sesv2Client: SESv2Client;
    private readonly nodeEnv: string;
    private readonly CACHE_TTL = 3600;
    private brevoApiKey: string;
    private brevoApi: string;
    private brevoEmail: string;
    private readonly restrictedEmailDomains: string[];
    private templates = new Map<string, HandlebarsTemplateDelegate>();
    private envSmtpConfig: SmtpConfig | null = null;

    constructor(
        private config: ConfigService,
        private tenantService: TenantService,
        private readonly redisService: RedisService,
        private readonly mailEncryption: MailEncryptionService,
        @InjectModel(TenantEmailTemplate.name)
        private readonly tenantTemplateModel: Model<TenantEmailTemplateDocument>,
        @InjectModel(MailboxConfig.name)
        private readonly mailboxConfigModel: Model<MailboxConfigDocument>,
    ) {
        this.nodeEnv = this.config.get<string>('node.environment');
        this.restrictedEmailDomains = this.config.get<string[]>(
            'email.restricted_domains',
        );
    }

    onModuleInit() {
        this.initSESv2();
        this.precompileTemplates();
        this.initEnvSmtp();
        this.initBrevo();
        Handlebars.registerHelper('eq', (a, b) => a === b);
    }

    private initBrevo() {
        this.brevoApiKey = this.config.get<string>('brevo.api_key');
        this.brevoEmail = this.config.get<string>('brevo.email');
        this.brevoApi = this.config.get<string>('brevo.api');
    }

    private initSESv2() {
        this.sesv2Client = new SESv2Client({
            region: this.config.get('aws.ses.region'),
            credentials: {
                accessKeyId: this.config.get('aws.ses.access_key'),
                secretAccessKey: this.config.get('aws.ses.secret_key'),
            },
        });
    }

    private initEnvSmtp() {
        const host = this.config.get<string>('smtp.host');
        const user = this.config.get<string>('smtp.user');
        const password = this.config.get<string>('smtp.password');

        if (host && user && password) {
            this.envSmtpConfig = {
                host,
                port: this.config.get<number>('smtp.port') ?? 587,
                secure: this.config.get<boolean>('smtp.secure') ?? false,
                user,
                password,
                fromName: this.config.get<string>('smtp.fromName') ?? 'jobsinc',
            };
            this.logger.log(`Env SMTP configured: ${user}@${host}`);
        }
    }

    private precompileTemplates() {
        const templateNames = [
            'accept',
            'reject',
            'interview-online',
            'interview-onsite',
            'reset-password-tenant-user',
            'applicant-user-creation',
            'interview-assignment',
        ];

        const templatesDir =
            this.nodeEnv === 'production'
                ? join(process.cwd(), 'dist/email/templates')
                : join(process.cwd(), 'apps/core/src/email/templates');

        templateNames.forEach((name) => {
            const filePath = join(templatesDir, `${name}.hbs`);
            const content = readFileSync(filePath, 'utf-8');
            this.templates.set(name, Handlebars.compile(content));
        });
    }

    async sendEmail(data: SendEmail): Promise<[string, boolean]> {
        try {
            const context = this.buildContext(data);
            const templateName = this.getTemplateName(data);

            const { html, subject } = await this.resolveTemplate(
                data.tenantId,
                templateName,
                data,
                context,
            );

            return await this.sendViaBrevo(
                data.fromName,
                data.toEmail,
                subject,
                html,
            );

            //const smtp = await this.resolveTransport(data);

            //if (smtp) {
            //return this.sendViaSMTP(smtp, data.toEmail, subject, html);
            //}

            //return this.sendViaSES(data, subject, html);
        } catch (err) {
            return [err.message, false];
        }
    }

    private async sendViaBrevo(
        fromName: string,
        toEmail: string,
        subject: string,
        html: string,
    ): Promise<[string, boolean]> {
        try {
            await axios.post(
                this.brevoApi,
                {
                    sender: { name: fromName, email: this.brevoEmail },
                    to: [{ email: toEmail }],
                    subject,
                    htmlContent: html,
                },
                {
                    headers: {
                        'api-key': this.brevoApiKey,
                        'Content-Type': 'application/json',
                    },
                },
            );

            return ['Success', true];
        } catch (err) {
            const message =
                err?.response?.data?.message ??
                err.message ??
                'Brevo send failed';
            this.logger.warn(`Brevo send failed to ${toEmail}: ${message}`);
            return [message, false];
        }
    }

    private async resolveTransport(
        data: SendEmail,
    ): Promise<SmtpConfig | null> {
        if (data.smtpConfig) return data.smtpConfig;

        if (data.tenantId) {
            const tenantSmtp = await this.resolveSmtpConfigFromDb(
                data.tenantId,
            );
            if (tenantSmtp) return tenantSmtp;
        }

        if (this.envSmtpConfig) return this.envSmtpConfig;

        return null;
    }

    private async sendViaSMTP(
        smtp: SmtpConfig,
        toEmail: string,
        subject: string,
        html: string,
    ): Promise<[string, boolean]> {
        try {
            const transporter = nodemailer.createTransport({
                host: smtp.host,
                port: smtp.port,
                secure: smtp.secure,
                auth: { user: smtp.user, pass: smtp.password },
                requireTLS: !smtp.secure,
            });

            await transporter.sendMail({
                from: `"${smtp.fromName}" <${smtp.user}>`,
                to: toEmail,
                subject,
                html,
            });

            return ['Success', true];
        } catch (err) {
            this.logger.warn(
                `SMTP send failed (${smtp.user}@${smtp.host}): ${err.message}`,
            );
            return [err.message, false];
        }
    }

    private async sendViaSES(
        data: SendEmail,
        subject: string,
        html: string,
    ): Promise<[string, boolean]> {
        try {
            const command = new SendEmailCommand({
                FromEmailAddress: `"${data.fromName}" <${data.fromEmail}>`,
                Destination: { ToAddresses: [data.toEmail] },
                Content: {
                    Simple: {
                        Subject: { Data: subject, Charset: 'UTF-8' },
                        Body: { Html: { Data: html, Charset: 'UTF-8' } },
                    },
                },
            });

            await this.sesv2Client.send(command);
            return ['Success', true];
        } catch (err) {
            return [err.message, false];
        }
    }

    private async resolveSmtpConfigFromDb(
        tenantId: string,
    ): Promise<SmtpConfig | null> {
        try {
            const config = await this.mailboxConfigModel
                .findOne({
                    tenantId: new Types.ObjectId(tenantId),
                    isVerified: true,
                    isActive: true,
                })
                .lean();

            if (!config) return null;

            const password = this.mailEncryption.decrypt(
                config.imapPasswordEnc,
            );
            const smtpHost = config.imapHost.replace(/^imap\./i, 'smtp.');
            const smtpPort = config.useSSL ? 465 : 587;

            return {
                host: smtpHost,
                port: smtpPort,
                secure: config.useSSL,
                user: config.imapUser,
                password,
                fromName: config.imapUser.split('@')[0],
            };
        } catch (err) {
            this.logger.warn(
                `Failed to resolve SMTP config for tenant ${tenantId}: ${err.message}`,
            );
            return null;
        }
    }

    private async resolveTemplate(
        tenantId: string | undefined,
        templateName: string,
        data: SendEmail,
        context: Record<string, any>,
    ): Promise<{ html: string; subject: string }> {
        if (tenantId) {
            const custom = await this.findCustomTemplate(
                tenantId,
                templateName,
            );
            if (custom) {
                return {
                    html: Handlebars.compile(custom.htmlContent)(context),
                    subject: Handlebars.compile(custom.subject)(context),
                };
            }
        }

        const systemTemplate = this.templates.get(templateName);
        if (!systemTemplate) {
            throw new Error(`No template found for: ${templateName}`);
        }

        return {
            html: systemTemplate(context),
            subject: this.getSubject(data),
        };
    }

    private async findCustomTemplate(
        tenantId: string,
        templateType: string,
    ): Promise<TenantEmailTemplateDocument | null> {
        try {
            return (await this.tenantTemplateModel
                .findOne({
                    tenantId: new Types.ObjectId(tenantId),
                    templateType,
                })
                .lean()) as any;
        } catch {
            return null;
        }
    }

    private getTemplateName(data: SendEmail): string {
        if (data.emailType === 'interview') {
            return data.interviewType === InterviewType.ONSITE
                ? 'interview-onsite'
                : 'interview-online';
        } else if (data.emailType === 'resetPassword') {
            return data.userType === AuthUserType.TENANT
                ? 'reset-password-tenant-user'
                : 'reset-password-global-user';
        } else if (data.emailType === 'applicantUserCreation') {
            return 'applicant-user-creation';
        } else if (data.emailType === 'interviewAssignment') {
            return 'interview-assignment';
        }
        return data.emailType;
    }

    private buildContext(data: SendEmail) {
        return {
            applicantName: data.applicantName,
            jobTitle: data.jobTitle,
            startDate: data.startDate,
            salary: data.salary,
            feedback: data.feedback,
            interviewDate: data.interviewDate,
            interviewTime: data.interviewTime,
            interviewLocation: data.interviewLocation,
            interviewType: data.interviewType,
            meetingLink: data.meetingLink,
            companyName: data.companyName,
            companyEmail: data.companyEmail,
            logoUrl: data.logoUrl,
            primaryColor: this.getPrimaryColor(data.emailType),
            websiteUrl: data.websiteUrl,
            resetLink: data.resetLink,
            year: new Date().getFullYear(),
            name: data.name,
            password: data.password,
            applicantEmail: data.applicantEmail,
            portalLink: data.portalLink,
        };
    }

    private getSubject(data: SendEmail): string {
        const subjects: Record<string, string> = {
            accept: `Congratulations! Your application for ${data.jobTitle} at ${data.companyName} has been accepted`,
            reject: `Update on your application for ${data.jobTitle} at ${data.companyName}`,
            interview: `Interview Invitation for ${data.jobTitle} at ${data.companyName}`,
            resetPassword: `Password Reset Request for your jobsinc account`,
            applicantUserCreation: 'Jobsinc Account Details',
            interviewAssignment: `Interview Scheduled: Select Your Time Slot for ${data.jobTitle} at ${data.companyName}`,
        };

        return subjects[data.emailType] ?? data.emailType;
    }

    private getPrimaryColor(emailType: string): string {
        const defaults: Record<string, string> = {
            accept: '#4CAF50',
            reject: '#2196F3',
            interview: '#FF9800',
        };

        return defaults[emailType] || '#4CAF50';
    }

    async sendDirectEmail(
        toEmail: string,
        fromName: string,
        subject: string,
        html: string,
    ): Promise<[string, boolean]> {
        return this.sendViaBrevo(fromName, toEmail, subject, html);
    }

    async verify(
        email: string,
    ): Promise<[string, boolean, EmailVerificationResponse]> {
        try {
            if (!this.isValidEmailFormat(email)) {
                return ['Invalid email format', false, null];
            }

            const domain = email.split('@')[1]?.toLowerCase();

            if (this.nodeEnv === 'production') {
                if (this.isRestricted(domain)) {
                    return ['Restricted Email Domain', false, null];
                }
            } else {
                const result = this.createMockValidResponse(domain);
                return ['Valid Email Address', true, result];
            }

            const cachedResult = await this.getCachedEmailResult(email);
            if (cachedResult) {
                return ['Success', true, cachedResult];
            }

            const command = new GetEmailAddressInsightsCommand({
                EmailAddress: email,
            });

            const response = await this.sesv2Client.send(command);
            const result = this.evaluateEmailValidity(response, domain);
            await this.cacheEmailResult(email, result);

            return ['Success', true, result];
        } catch (error) {
            const errorMessage = error?.message || 'Email verification failed';
            return [errorMessage, false, null];
        }
    }

    async getCachedEmailVerification(
        email: string,
    ): Promise<[string, boolean, EmailVerificationResponse]> {
        try {
            if (!this.isValidEmailFormat(email)) {
                return ['Invalid email format', false, null];
            }

            const cachedResult = await this.getCachedEmailResult(email);

            if (!cachedResult) {
                return ['No verification found for this email', false, null];
            }

            return ['Success', true, cachedResult];
        } catch (error) {
            const errorMessage =
                error?.message || 'Error retrieving email verification';
            return [errorMessage, false, null];
        }
    }

    private isValidEmailFormat(email: string): boolean {
        if (!email || typeof email !== 'string') return false;
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }

    private async getCachedEmailResult(
        email: string,
    ): Promise<EmailVerificationResponse | null> {
        try {
            const cached = await this.redisService.get(
                this.getEmailCacheKey(email),
            );
            if (!cached) return null;
            return JSON.parse(cached) as EmailVerificationResponse;
        } catch {
            return null;
        }
    }

    private async cacheEmailResult(
        email: string,
        result: EmailVerificationResponse,
    ): Promise<void> {
        try {
            await this.redisService.write(
                this.getEmailCacheKey(email),
                JSON.stringify(result),
                this.CACHE_TTL,
            );
        } catch (error) {
            this.logger.error('Error caching email result:', error?.message);
        }
    }

    private getEmailCacheKey(email: string): string {
        return `email_verification_${email}`;
    }

    private createMockValidResponse(domain: string): EmailVerificationResponse {
        return {
            valid: true,
            result: 'VALID',
            deliverabilityScore: 100,
            isDisposable: false,
            domain,
            reason: null,
        };
    }

    private evaluateEmailValidity(
        response: any,
        domain: string,
    ): EmailVerificationResponse {
        const mailboxValidation = response.MailboxValidation;
        const evaluations = mailboxValidation.Evaluations;

        const hasCriticalFailure =
            evaluations.HasValidSyntax.ConfidenceVerdict === 'LOW' ||
            evaluations.HasValidDnsRecords.ConfidenceVerdict === 'LOW' ||
            evaluations.IsRandomInput.ConfidenceVerdict === 'HIGH' ||
            evaluations.MailboxExists.ConfidenceVerdict === 'LOW';

        if (hasCriticalFailure) {
            return {
                valid: false,
                result: 'INVALID',
                deliverabilityScore: 0,
                isDisposable:
                    evaluations.IsDisposable.ConfidenceVerdict === 'HIGH',
                domain,
                reason: this.getFailureReason(evaluations),
            };
        }

        const deliverabilityScore =
            this.calculateDeliverabilityScore(evaluations);
        const awsVerdict =
            mailboxValidation.IsValid.ConfidenceVerdict === 'HIGH';
        const hasAcceptableScore = deliverabilityScore >= 60;
        const isDisposable =
            evaluations.IsDisposable.ConfidenceVerdict === 'HIGH';
        const isValid = awsVerdict && hasAcceptableScore && !isDisposable;

        return {
            valid: isValid,
            result: isValid ? 'VALID' : 'INVALID',
            deliverabilityScore,
            isDisposable,
            domain,
            reason: isValid
                ? null
                : this.getInvalidReason(
                      evaluations,
                      deliverabilityScore,
                      isDisposable,
                  ),
        };
    }

    private calculateDeliverabilityScore(evaluations: any): number {
        let score = 0;

        if (evaluations.HasValidSyntax.ConfidenceVerdict === 'HIGH')
            score += 20;
        else if (evaluations.HasValidSyntax.ConfidenceVerdict === 'MEDIUM')
            score += 10;

        if (evaluations.HasValidDnsRecords.ConfidenceVerdict === 'HIGH')
            score += 25;
        else if (evaluations.HasValidDnsRecords.ConfidenceVerdict === 'MEDIUM')
            score += 12;

        if (evaluations.MailboxExists.ConfidenceVerdict === 'HIGH') score += 30;
        else if (evaluations.MailboxExists.ConfidenceVerdict === 'MEDIUM')
            score += 20;

        if (evaluations.IsDisposable.ConfidenceVerdict === 'LOW') score += 15;
        else if (evaluations.IsDisposable.ConfidenceVerdict === 'MEDIUM')
            score += 7;

        if (evaluations.IsRoleAddress.ConfidenceVerdict === 'LOW') score += 5;
        else if (evaluations.IsRoleAddress.ConfidenceVerdict === 'MEDIUM')
            score += 2;

        if (evaluations.IsRandomInput.ConfidenceVerdict === 'LOW') score += 5;
        else if (evaluations.IsRandomInput.ConfidenceVerdict === 'MEDIUM')
            score += 2;

        return score;
    }

    private getFailureReason(evaluations: any): string {
        if (evaluations.HasValidSyntax.ConfidenceVerdict === 'LOW')
            return 'Invalid email syntax';
        if (evaluations.HasValidDnsRecords.ConfidenceVerdict === 'LOW')
            return 'Domain does not have valid DNS records';
        if (evaluations.IsRandomInput.ConfidenceVerdict === 'HIGH')
            return 'Email appears to be random or fake input';
        if (evaluations.MailboxExists.ConfidenceVerdict === 'LOW')
            return 'Mailbox does not exist';
        return 'Email validation failed';
    }

    private getInvalidReason(
        evaluations: any,
        score: number,
        isDisposable: boolean,
    ): string {
        const reasons: string[] = [];
        if (isDisposable) reasons.push('disposable email address');
        if (evaluations.MailboxExists.ConfidenceVerdict === 'LOW')
            reasons.push('mailbox may not exist');
        if (score < 60) reasons.push('low deliverability score');
        if (evaluations.IsRoleAddress.ConfidenceVerdict === 'HIGH')
            reasons.push('role-based email address');
        return reasons.length > 0
            ? `Email rejected: ${reasons.join(', ')}`
            : 'Email does not meet validation criteria';
    }

    private isRestricted(domain: string): boolean {
        if (!domain) return true;
        return this.restrictedEmailDomains.includes(domain);
    }
}
