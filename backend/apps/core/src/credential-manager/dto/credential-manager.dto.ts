import { IsArray, ArrayNotEmpty, IsEmail } from 'class-validator';

export class RevokeLinkedInCredentialsDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsEmail({}, { each: true })
    emails: string[];
}

export class GetGoogleCalenderStatus {
    googleInit: boolean;
    isExpired: boolean;
    email?: string;
    expiryDate?: string;
    name: string;
}
