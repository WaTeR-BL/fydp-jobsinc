export class CreateApplicantDto {
    fullName: string;
    contact?: string;
    email: string;
    timezone: string;
}

export class UpdateApplicantDto {
    fullName: string;
    contact?: string;
    timezone: string;
}
