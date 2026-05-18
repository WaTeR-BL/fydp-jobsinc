import { Injectable } from '@nestjs/common';
import { AggregatePaginateModel } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Plan, PlanDocument } from '@app/common';
import { GetAllPlanDto } from './dto/plan.dto';
import { GetPlanDocument } from './interface/plan.interface';

@Injectable()
export class PlanService {
    constructor(
        @InjectModel(Plan.name)
        private readonly planModel: AggregatePaginateModel<PlanDocument>,
    ) {}

    async getAll(): Promise<[string, boolean, GetAllPlanDto[]]> {
        try {
            const [plans] = await Promise.all([
                this.planModel
                    .find({ status: true })
                    .sort({ sequence: 1 })
                    .lean<GetPlanDocument[]>()
                    .exec(),
            ]);

            const items: GetAllPlanDto[] = plans.map((plan) => ({
                id: plan._id.toString(),
                name: plan.name,
                type: plan.type,
                price: plan.price,
                cvLimit: plan.cvLimit,
                socialIntegration: plan.socialIntegration,
                aiAssistance: plan.aiAssistance,
                aiSummary: plan.aiSummary,
                googleMeetLink: plan.googleMeetLink,
                reminderMessages: plan.reminderMessages,
                bulkUploadCv: plan.bulkUploadCv,
                aiNoteTaking: plan.aiNoteTaking,
                unitCvPrice: plan.unitCvPrice,
                unitReminderPrice: plan.unitReminderPrice,
                addonPrice: plan.addonPrice,
                whatsappIntegration: plan.whatsappIntegration,
                freePromptCredit: plan.freePromptCredit,
                status: plan.status,
                stripePriceId: plan.stripePriceId,
                evalBlocksIncluded: plan.evalBlocksIncluded,
                evalBlocksPrice: plan.evalBlocksPrice,
                interviewerSeats: plan.interviewerSeats,
                activeJobsLimit: plan.activeJobsLimit,
                createdAt: plan.createdAt.toISOString(),
                updatedAt: plan.updatedAt.toISOString(),
            }));

            return ['Success', true, items];
        } catch (error) {
            return [error.message, false, null];
        }
    }
}
