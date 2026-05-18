import { Module } from '@nestjs/common';
import { PlanService } from './plan.service';
import { PlanController } from './plan.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Plan, PlanSchema } from '@app/common';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Plan.name, schema: PlanSchema }]),
    ],
    providers: [PlanService],
    controllers: [PlanController],
})
export class PlanModule {}
