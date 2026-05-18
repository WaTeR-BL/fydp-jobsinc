import {
    IsArray,
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
} from 'class-validator';

export class CreateCheckoutSessionDto {
    @IsString()
    @IsNotEmpty()
    priceId: string;

    @IsUrl({ require_tld: false })
    @IsNotEmpty()
    successUrl: string;

    @IsUrl({ require_tld: false })
    @IsNotEmpty()
    cancelUrl: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    addonPriceIds?: string[];
}

export class CreatePortalSessionDto {
    @IsUrl({ require_tld: false })
    @IsNotEmpty()
    returnUrl: string;
}

export class ChangePlanDto {
    @IsString()
    @IsNotEmpty()
    priceId: string;

    @IsBoolean()
    isUpgrade: boolean;
}
