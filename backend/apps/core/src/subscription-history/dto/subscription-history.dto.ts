import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateSubscriptionHistoryDto {
    @IsNotEmpty()
    @IsString()
    subscriptionId: string;
    @IsNotEmpty()
    @IsNumber()
    amount: number;
    @IsNotEmpty()
    paymentIntentId: string;
    @IsNotEmpty()
    @IsNumber()
    status: number;

    constructor(init?: Partial<CreateSubscriptionHistoryDto>) {
        Object.assign(this, init);
    }
}
