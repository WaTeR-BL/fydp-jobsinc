import { Module } from '@nestjs/common';
import { DomainService } from './domain.service';
import { DomainController } from './domain.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { DomainSchema, Domain } from '@app/common';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Domain.name, schema: DomainSchema },
        ]),
    ],
    providers: [DomainService],
    controllers: [DomainController],
})
export class DomainModule {}
