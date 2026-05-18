import { IsArray, IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class CreateTenantSubscriptionDto {
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    planId: string[];
    @IsString()
    @IsNotEmpty()
    tenantId: string;
    @IsBoolean()
    @IsNotEmpty()
    autoPayment: boolean;

    constructor(init?: Partial<CreateTenantSubscriptionDto>) {
        Object.assign(this, init);
    }
}
