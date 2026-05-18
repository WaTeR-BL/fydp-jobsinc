import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AggregatePaginateModel, ClientSession, Types } from 'mongoose';
import { CreateApplicantDto, UpdateApplicantDto } from './dto/applicant.dto';
import { Applicant, ApplicantDocument } from '@app/common';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { SendEmail } from '../email/interface/email.interface';
import { EmailTemplate } from '@app/common/enums/app.enums';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApplicantService {
        private readonly frontendUrl: string;
    constructor(
        @InjectModel(Applicant.name)
        private readonly applicantModel: AggregatePaginateModel<ApplicantDocument>,
        private readonly emailService: EmailService,
        private readonly config: ConfigService,
    ) {
        this.frontendUrl = this.config.get<string>('frontend.url');
    }

    async getByEmail(email: string): Promise<[string, boolean, string]> {
        try {
            const data = await this.applicantModel
                .findOne({ email: email })
                .exec();

            return ['Success', true, data?.id] as [string, boolean, string];
        } catch (err) {
            return [err.message, false, null] as [string, boolean, string];
        }
    }

    async create(
        dto: CreateApplicantDto,
        session?: ClientSession,
    ): Promise<[string, boolean, string]> {
        try {
            const applicant = new this.applicantModel({
                fullName: dto.fullName,
                email: dto.email,
                contact: dto.contact,
                timezone: dto.timezone,
            });

            await applicant.save({ session });

            return ['Success', true, applicant.id] as [string, boolean, string];
        } catch (err) {
            return [err.msg, false, null] as [string, boolean, string];
        }
    }

    async updateContact(
        id: string,
        contact?: string | null,
        session?: ClientSession,
    ): Promise<[string, boolean]> {
        try {
            if (contact === undefined) {
                return ['Success', true];
            }

            const existing = await this.applicantModel.findById(
                id,
                { contact: 1 },
                { session },
            );

            if (existing.contact === contact) {
                return ['No update needed', true];
            }

            await this.applicantModel.updateOne(
                { _id: new Types.ObjectId(id) },
                { $set: { contact } },
                { session },
            );

            return ['Updated successfully', true];
        } catch (err) {
            return [err.message, false];
        }
    }

    async createUser(
        id: string,
        data: string,
        session?: ClientSession,
    ): Promise<[string, boolean]> {
        try {
            const hashedPassword = await bcrypt.hash(data, 10);

            const applicant = await this.applicantModel
                .findOneAndUpdate(
                    { _id: id, password: null },
                    { $set: { password: hashedPassword } },
                    { new: false, session },
                )
                .lean();

            if (!applicant) {
                const exists = await this.applicantModel.exists({ _id: id });
                if (!exists) {
                    return ['Applicant not found', false];
                }
                return ['Success', true];
            }

            const email: SendEmail = {
                fromName: 'jobsinc',
                fromEmail: 'no-reply@jobsinc.ai',
                toEmail: applicant.email,
                emailType: EmailTemplate.APPLICANT_USER_CREATION,
                password: data,
                applicantName: applicant.fullName,
                applicantEmail: applicant.email,
                portalLink: `${this.frontendUrl}/applicant/login?email=${applicant.email}`,
            };

            const [msg, ok] = await this.emailService.sendEmail(email);

            return ['Success', true];
        } catch (err) {
            return [err.message, false];
        }
    }

    async validateApplicant(
        email: string,
        password: string,
    ): Promise<[string, boolean, any]> {
        try {
            const data = await this.applicantModel
                .findOne({
                    email: email,
                })
                .exec();
            if (!data) return ['No such applicant exist', false, data];
            const isValid: boolean = await bcrypt.compare(
                password,
                data.password,
            );
            if (!isValid) return ['Invalid Credentials', false, null];
            return ['Success', true, data];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async findById(id: string): Promise<[string, boolean, any]> {
        try {
            const data = await this.applicantModel.findById(id).exec();
            if (!data) return ['applicant not found', false, null];
            return ['Success', true, data];
        } catch (error) {
            return [error.message, false, null];
        }
    }

    async updateRtHash(
        userId: string,
        refreshToken: string,
    ): Promise<[string, boolean]> {
        try {
            const rt = await bcrypt.hash(refreshToken, 10);
            const update = await this.applicantModel.findByIdAndUpdate(
                userId,
                {
                    hashedRefreshToken: rt,
                },
                { new: false },
            );
            if (!update) return ['Failure', false];

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async deleteApplicantRtHash(id: string): Promise<[string, boolean]> {
        try {
            const update = await this.applicantModel.findByIdAndUpdate(
                id,
                {
                    hashedRefreshToken: null,
                },
                { new: false },
            );
            if (!update) return ['Failure', false];

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }

    async update(
        id: string,
        dto: UpdateApplicantDto,
    ): Promise<[string, boolean]> {
        try {
            const result = await this.applicantModel.updateOne(
                {
                    _id: new Types.ObjectId(id),
                },
                {
                    $set: {
                        timezone: dto.timezone,
                        fullName: dto.fullName,
                        contact: dto.contact,
                    },
                },
            );

            if (result.matchedCount === 0) {
                return ['No Applicant found', false];
            }

            return ['Success', true];
        } catch (error) {
            return [error.message, false];
        }
    }
}
